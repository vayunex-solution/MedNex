'use strict';

const { Op } = require('sequelize');

class Specification {
  and(other) {
    return new ConjunctionSpecification(this, other);
  }

  or(other) {
    return new DisjunctionSpecification(this, other);
  }

  toQuery() {
    return {};
  }
}

class ConjunctionSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  toQuery() {
    const leftQuery = this.left.toQuery();
    const rightQuery = this.right.toQuery();
    return { [Op.and]: [leftQuery, rightQuery] };
  }
}

class DisjunctionSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  toQuery() {
    const leftQuery = this.left.toQuery();
    const rightQuery = this.right.toQuery();
    return { [Op.or]: [leftQuery, rightQuery] };
  }
}

module.exports = Specification;
