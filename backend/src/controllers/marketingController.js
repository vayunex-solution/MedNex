'use strict';

const sequelize = require('../config/database');
const queueManager = require('../shared/queues/QueueManager');
const { success, badRequest } = require('../helpers/response');

const getRecipientsForSegment = async (tenantId, segment) => {
  let emails = [];
  if (segment === 'VIP') {
    // Lifetime spent >= 15,000
    const [rows] = await sequelize.query(
      `SELECT DISTINCT c.email FROM customers c
       JOIN sales s ON s.customerId = c.id
       WHERE c.tenantId = ? AND c.isDeleted = 0 AND c.email IS NOT NULL
       GROUP BY c.id HAVING SUM(s.grandTotal) >= 15000`,
      { replacements: [tenantId] }
    );
    emails = rows.map(r => r.email);
  } else if (segment === 'Inactive') {
    // No sales in last 60 days
    const [rows] = await sequelize.query(
      `SELECT DISTINCT c.email FROM customers c
       WHERE c.tenantId = ? AND c.isDeleted = 0 AND c.email IS NOT NULL AND c.id NOT IN (
         SELECT customerId FROM sales WHERE invoiceDate >= DATE_SUB(NOW(), INTERVAL 60 DAY)
       )`,
      { replacements: [tenantId] }
    );
    emails = rows.map(r => r.email);
  } else if (segment === 'Doctors') {
    const [rows] = await sequelize.query(
      'SELECT DISTINCT email FROM doctors WHERE tenantId = ? AND isDeleted = 0 AND email IS NOT NULL',
      { replacements: [tenantId] }
    );
    emails = rows.map(r => r.email);
  } else if (segment === 'Suppliers') {
    const [rows] = await sequelize.query(
      'SELECT DISTINCT email FROM suppliers WHERE tenantId = ? AND isDeleted = 0 AND email IS NOT NULL',
      { replacements: [tenantId] }
    );
    emails = rows.map(r => r.email);
  } else {
    // 'All Customers'
    const [rows] = await sequelize.query(
      'SELECT DISTINCT email FROM customers WHERE tenantId = ? AND isDeleted = 0 AND email IS NOT NULL',
      { replacements: [tenantId] }
    );
    emails = rows.map(r => r.email);
  }
  return emails.filter(Boolean);
};

const createCampaign = async (req, res) => {
  const { name, subject, body, segment } = req.body;
  if (!name || !subject || !body || !segment) {
    return badRequest(res, 'Missing required campaign fields');
  }

  const tenantId = req.user.tenantId || 1;

  const [result] = await sequelize.query(
    `INSERT INTO plat_email_campaigns (tenantId, name, subject, body, segment, status, createdAt)
     VALUES (?, ?, ?, ?, ?, 'draft', NOW())`,
    { replacements: [tenantId, name, subject, body, segment] }
  );

  return success(res, { id: result }, 'Campaign draft created successfully');
};

const listCampaigns = async (req, res) => {
  const tenantId = req.user.tenantId || 1;
  const [campaigns] = await sequelize.query(
    'SELECT * FROM plat_email_campaigns WHERE tenantId = ? ORDER BY createdAt DESC',
    { replacements: [tenantId] }
  );
  return success(res, campaigns);
};

const getSegmentsCount = async (req, res) => {
  const tenantId = req.user.tenantId || 1;
  const vip = await getRecipientsForSegment(tenantId, 'VIP');
  const inactive = await getRecipientsForSegment(tenantId, 'Inactive');
  const doctors = await getRecipientsForSegment(tenantId, 'Doctors');
  const suppliers = await getRecipientsForSegment(tenantId, 'Suppliers');
  const all = await getRecipientsForSegment(tenantId, 'All');

  return success(res, {
    VIP: vip.length,
    Inactive: inactive.length,
    Doctors: doctors.length,
    Suppliers: suppliers.length,
    All: all.length,
  });
};

const triggerCampaign = async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId || 1;

  const [campaigns] = await sequelize.query(
    'SELECT * FROM plat_email_campaigns WHERE id = ? AND tenantId = ? LIMIT 1',
    { replacements: [id, tenantId] }
  );
  const campaign = campaigns[0];
  if (!campaign) {
    return badRequest(res, 'Campaign not found');
  }

  const recipients = await getRecipientsForSegment(tenantId, campaign.segment);
  if (recipients.length === 0) {
    return badRequest(res, 'No recipients found for this target segment');
  }

  // Update status to sending
  await sequelize.query(
    'UPDATE plat_email_campaigns SET status = "sending", sentCount = ? WHERE id = ?',
    { replacements: [recipients.length, id] }
  );

  // Queue each recipient
  for (const email of recipients) {
    const [logResult] = await sequelize.query(
      `INSERT INTO plat_email_campaign_logs (campaignId, recipientEmail, status)
       VALUES (?, ?, 'pending')`,
      { replacements: [id, email] }
    );

    // Queue job
    await queueManager.enqueue('send-campaign-email', {
      tenantId,
      to: email,
      subject: campaign.subject,
      html: campaign.body,
      logId: logResult,
    });
  }

  // Set status to completed immediately (jobs will process asynchronously)
  await sequelize.query(
    'UPDATE plat_email_campaigns SET status = "completed" WHERE id = ?',
    { replacements: [id] }
  );

  return success(res, null, `Campaign dispatched to ${recipients.length} recipients successfully`);
};

module.exports = {
  createCampaign,
  listCampaigns,
  getSegmentsCount,
  triggerCampaign,
};
