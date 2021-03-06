const {BaseModel} = require('@ucd-lib/cork-app-utils');
const DoiService = require('../services/DoiService');
const DoiStore = require('../stores/DoiStore');

class DoiModel extends BaseModel {

  constructor() {
    super();

    this.store = DoiStore;
    this.service = DoiService;

    this.register('DoiModel');
  }

  /**
   * @method get
   * @description get all DOI requests for a package
   * 
   * @param {String} id package id 
   */
  async get(id) {
    await this.service.get(id);
    return this.store.data.pkgDois[id];
  }

  async requestDoi(id, tag) {
    await this.service.requestDoi(id, tag);
    return this.store.data.dois[id+'-'+tag];
  }

  async search(type, text) {
    try {
      await this.service.search(type, text);
    } catch(e) {
      console.error(e);
    }
    return this.store.data.search;
  }

  async updateState(action, doi, message) {
    if( action === 'request-revision' ) {
      await this.service.update(doi, message);
    } else if( action === 'approve' ) {
      await this.service.approve(doi);
    } else if( action === 'cancel' ) {
      await this.service.cancel(doi, message);
    } else {
      throw new Error('Unknown DOI action: '+action);
    }

    return this.store.data.dois[doi.id+'-'+doi.tag];
  }
}

module.exports = new DoiModel();