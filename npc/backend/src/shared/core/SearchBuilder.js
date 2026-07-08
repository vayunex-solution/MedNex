'use strict';

const { Op } = require('sequelize');

class SearchBuilder {
  constructor() {
    this.conditions = [];
  }

  like(field, value) {
    if (value) {
      this.conditions.push({ [field]: { [Op.like]: `%${value}%` } });
    }
    return this;
  }

  orLike(fields, value) {
    if (value && fields.length > 0) {
      this.conditions.push({
        [Op.or]: fields.map((f) => ({ [f]: { [Op.like]: `%${value}%` } })),
      });
    }
    return this;
  }

  eq(field, value) {
    if (value !== undefined && value !== null && value !== '') {
      this.conditions.push({ [field]: value });
    }
    return this;
  }

  in(field, values) {
    if (values && values.length > 0) {
      this.conditions.push({ [field]: { [Op.in]: values } });
    }
    return this;
  }

  between(field, start, end) {
    if (start && end) {
      this.conditions.push({ [field]: { [Op.between]: [new Date(start), new Date(end)] } });
    }
    return this;
  }

  build() {
    if (this.conditions.length === 0) return {};
    if (this.conditions.length === 1) return this.conditions[0];
    return { [Op.and]: this.conditions };
  }
}

module.exports = SearchBuilder;
