const {BaseService} = require('@ucd-lib/cork-app-utils');
const PackageStore = require('../stores/PackageStore');
const uuid = require('uuid');

class PackageService extends BaseService {

  constructor() {
    super();
    this.store = PackageStore;
  }

  /**
   * @method create
   * @description create a new package
   * 
   * @param {String} name name of package 
   * @param {String} description one sentence overview description
   */
  async create(name, description) {
    let payload = {name, description};

    return this.request({
      url : '/package',
      fetchOptions : {
        method : 'POST',
        body  : payload
      },
      json : true,
      onLoading : request => this.store.setCreatePackageLoading(request, payload),
      onLoad : result => this.store.setCreatePackageSuccess(result.body),
      onError : error => this.store.setCreatePackageError(error)
    })
  }

  /**
   * @method get
   * @description get a package by id.  the /package/:id request also 
   * accepts /package/:name
   * 
   * @param {String} id package ecosml id 
   */
  async get(id) {
    return this.request({
      url : `/package/${id}`,
      onLoading : request => this.store.setGetPackageLoading(id, request),
      onLoad : result => this.store.setGetPackageSuccess(id, result.body),
      onError : error => this.store.setGetPackageError(id, error)
    });
  }

  async delete(name) {
    return this.request({
      url : `/package/${name}`,
      fetchOptions : {
        method : 'DELETE'
      },
      onLoading : request => this.store.setDeletingPackage(request, payload),
      onLoad : result => this.store.setDeletePackageSuccess(result.body),
      onError : error => this.store.setDeletePackageError(error)
    });
  }

  async addFile(formData) {
    let id = uuid.v4();
    let filename = formData.get('filename'); 
    let payload = {filename};

    return this.request({
      url : '/package/addFile',
      fetchOptions : {
        method : 'POST',
        body : formData
      },
      onLoading : request => this.store.setFileSaving(request, fileId, payload),
      onLoad : result => this.store.setFileSaved(fileId, payload),
      onError : error => this.store.setFileSaveError(fileId, error)
    });
  }

}

module.exports = new PackageService();