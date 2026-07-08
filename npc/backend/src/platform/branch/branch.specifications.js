'use strict';

const Specification = require('../../shared/core/Specification');
const { Op } = require('sequelize');

class BranchSearchSpecification extends Specification {
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
        { branchCode: { [Op.like]: `%${this.searchQuery}%` } },
      ]
    };
  }
}

class BranchFilterSpecification extends Specification {
  constructor(filters = {}) {
    super();
    this.filters = filters;
  }

  toQuery() {
    const query = {};
    const { status, tenantId, businessId, startDate, endDate } = this.filters;

    if (status) query.status = status;
    if (tenantId) query.tenantId = tenantId;
    if (businessId) query.businessId = businessId;

    if (startDate && endDate) {
      query.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    return query;
  }
}

module.exports = {
  BranchSearchSpecification,
  BranchFilterSpecification,
};
