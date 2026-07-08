'use strict';

const Specification = require('../../shared/core/Specification');
const { Op } = require('sequelize');

class BusinessSearchSpecification extends Specification {
  constructor(searchQuery) {
    super();
    this.searchQuery = searchQuery;
  }

  toQuery() {
    if (!this.searchQuery) return {};
    return {
      [Op.or]: [
        { name: { [Op.like]: `%${this.searchQuery}%` } },
        { slug: { [Op.like]: `%${this.searchQuery}%` } },
        { email: { [Op.like]: `%${this.searchQuery}%` } },
        { industry: { [Op.like]: `%${this.searchQuery}%` } },
        { businessType: { [Op.like]: `%${this.searchQuery}%` } },
      ]
    };
  }
}

class BusinessFilterSpecification extends Specification {
  constructor(filters = {}) {
    super();
    this.filters = filters;
  }

  toQuery() {
    const query = {};
    const { status, industry, businessType, tenantId, startDate, endDate } = this.filters;

    if (status) query.status = status;
    if (industry) query.industry = industry;
    if (businessType) query.businessType = businessType;
    if (tenantId) query.tenantId = tenantId;

    if (startDate && endDate) {
      query.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    return query;
  }
}

module.exports = {
  BusinessSearchSpecification,
  BusinessFilterSpecification,
};
