'use strict';

class PaginationBuilder {
  static build(page = 1, limit = 10) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    return {
      limit: limitNum,
      offset,
      page: pageNum,
    };
  }

  static order(sort = 'createdAt', direction = 'DESC') {
    const dir = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return [[sort, dir]];
  }
}

module.exports = PaginationBuilder;
