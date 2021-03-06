const mongodb = require('mongodb');
const logger = require('../logger');
const config = require('../config');
const packageUtils = require('../package');
const queryMapReduce = require('./query-map-reduce');
const statsMapReduce = require('./stats-map-reduce');

class MongoDB {

  conn() {
    if( this.db ) return this.db

    return new Promise((resolve, reject) => {
      mongodb.connect(config.mongodb.url, (error, db) => {
        if( error ) {
          return reject(error);
        }

        db.on('close', e => {
          logger.warn('MongoDB connection closed', e);
          this.db = null;
        });

        this.db = db;
        logger.info('MongoDB connected');
        resolve(db);
      });
    });
  }

  disconnect() {
    this.db.close();
  }

  async packagesCollection() {
    await this.conn();
    return this.db.collection(config.mongodb.collections.package);
  }

  async getStatsCollection() {
    await this.conn();
    return this.db.collection(config.mongodb.collections.stats);
  }

  async githubTeamCollection() {
    await this.conn();
    return this.db.collection(config.mongodb.collections.githubTeam);
  }

  async getDoiCollection() {
    await this.conn();
    return this.db.collection(config.mongodb.collections.doi);
  }

  async createPackageIndexes() {
    let collection = await this.packagesCollection();
    let indexes = config.mongodb.indexes.package;

    let results = [];
    for( var i = 0; i < indexes.length; i++ ) {
      let index = indexes[i];
      let result = await collection.createIndex(index.index, index.options);
      results.push(result);
    }

    return results;
  }

  async recreatePackageIndexes() {
    let collection = await this.packagesCollection();
    let indexes = config.mongodb.indexes.package;

    let results = [];
    for( var i = 0; i < indexes.length; i++ ) {
      let index = indexes[i];

      try {
        await collection.dropIndex(index.options.name);
      } catch(e) {}

      let result = await collection.createIndex(index.index, index.options);
      results.push(result);
    }

    return results;
  }

  async recreateGithubTeamIndexes() {
    let collection = await this.githubTeamCollection();
    let indexes = config.mongodb.indexes['github-team'];

    let results = [];
    for( var i = 0; i < indexes.length; i++ ) {
      let index = indexes[i];

      try {
        await collection.dropIndex(index.options.name);
      } catch(e) {}

      let result = await collection.createIndex(index.index, index.options);
      results.push(result);
    }

    return results;
  }

  async recreateDoiIndexes() {
    let collection = await this.getDoiCollection();
    let indexes = config.mongodb.indexes.doi;

    let results = [];
    for( var i = 0; i < indexes.length; i++ ) {
      let index = indexes[i];

      try {
        await collection.dropIndex(index.options.name);
      } catch(e) {}

      let result = await collection.createIndex(index.index, index.options);
      results.push(result);
    }

    return results;
  }

  async recreateIndexes() {
    let pkgs = await this.recreatePackageIndexes();
    let githubTeams = await this.recreateGithubTeamIndexes();
    let dois = await this.recreateDoiIndexes();
    return {pkgs, githubTeams, dois};
  }

  /**
   * @method search
   */
  async search(query = {}, options = {}, projection = {}) {
    let offset = options.offset || 0;
    let limit = options.limit || 10;
    if( limit > 100 ) limit = 100;
    let sort = options.sort || {name: 1};

    let collection = await this.packagesCollection();

    let total = await collection.count(query);
    let results = await collection
                    .find(query, options)
                    .limit(limit)
                    .skip(offset)
                    .sort(sort)
                    .toArray();
    
    let filters = await queryMapReduce(collection, query);
    if( filters.length == 0 ) filters = {};
    else filters = filters[0].value;

    return {
      offset, limit, sort,
      filters, total, results
    }
  }

  async getAllPackageNames() {
    let collection = await this.packagesCollection();
    return collection.find({}, {name: 1, host: 1, fullName: 1, repoOrg: 1, id: 1}).toArray();
  }

  /**
   * @method getAllOrgPackageNames
   * @description get all package names for an org
   * 
   * @param {String} orgName organization name
   * 
   * @returns {Promise} resolves to mongo db result
   */
  async getAllOrgPackageNames(orgName) {
    let collection = await this.packagesCollection();
    return collection.find({organization: orgName}, {name: 1, id: 1, host: 1, githubId: 1}).toArray();
  }

  async getAllRegisteredRepositoryIds() {
    let collection = await this.packagesCollection();
    return collection
      .find({source: 'registered'}, {name: 1, id: 1})
      .toArray();
  }

  /**
   * @method insertPackage
   * @description insert or update a package
   */
  async insertPackage(pkg) {
    let collection = await this.packagesCollection();
    let result = collection.update({id: pkg.id}, pkg, {upsert: true});
    this.updateStats(); // don't wait for this
    return result;
  }

  /**
   * @method updatePackage
   * @description update package data.  this will patch provided data.
   * 
   * @param {String} packageNameOrId package name or id
   * @param {Object} data package data to update
   * 
   * @returns {Promise}
   */
  async updatePackage(packageNameOrId, data) {
    let collection = await this.packagesCollection();
    let result = await collection.update({
      id: await this.getPackageId(packageNameOrId)
    }, {
      $set: data
    });

    this.updateStats(); // don't wait for this

    return result
  }

  /**
   * @method getPackage
   * @description get a package by name, id or DOI.  id can be ecosml
   * id or GitHub id
   * 
   * @param {String|Object} packageNameOrId
   * @param {Object} project
   * 
   * @returns {Promise} resolves to mongo response
   */
  async getPackage(packageNameOrId, projection = {}) {
    if( !packageNameOrId ) throw new Error('Package name or id required');
    let collection = await this.packagesCollection();
    let idLookup = packageUtils.parseId(packageNameOrId);

    // if this is a doi, we need to lookup package id
    if( idLookup.doi ) {
      let doi = await this.getDoi(idLookup.doi);
      idLookup = {id: doi.id};
    }

    return collection.findOne(idLookup, projection);
  }

  /**
   * @method getPackageId
   * @description get a package id by provided full host/org/name, doi
   * or id.
   * 
   * @param {String|Object} packageNameOrId
   * 
   * @returns {Promise} resolves to mongo response
   */
  async getPackageId(packageNameOrId) {
    let idObj = packageUtils.parseId(packageNameOrId);

    if( idObj.doi ) {
      let doiCollection = await this.getDoiCollection();
      let result = await doiCollection.findOne(idObj, {id: 1});
      if( !result ) throw new Error('Unknown package DOI: '+packageNameOrId);
      return result.id;
    }

    if( idObj.name ) {
      let collection = await this.packagesCollection();
      let result = await collection.findOne(idObj, {id: 1});
      if( !result ) throw new Error('Unknown package name: '+idObj.host+'/'+idObj.name);
      return result.id;
    }

    return idObj.id;
  }

  /**
   * @method removePackage
   * @description remove a package by name or id
   * 
   * @param {String} packageNameOrId
   * 
   * @returns {Promise} resolves to mongo response
   */
  async removePackage(packageNameOrId, host) {
    let collection = await this.packagesCollection();
    let result = await collection.remove({id: await this.getPackageId(packageNameOrId)});

    this.updateStats(); // don't wait for this

    return result;
  }

  /**
   * @method insertGithubTeam
   * @description insert or update a github team
   */
  async insertGithubTeam(team) {
    let collection = await this.githubTeamCollection();
    return collection.update({id: team.id}, team, {upsert: true});
  }

  /**
   * @method removeGithubTeam
   * @description remove a github team by slug or id
   * 
   * @param {String} teamSlugOrId
   * 
   * @returns {Promise} resolves to mongo response
   */
  async removeGithubTeam(teamSlugOrId) {
    let collection = await this.githubTeamCollection();
    return collection.remove({
      $or : [
        {slug: teamSlugOrId},
        {id : teamSlugOrId}
      ]
    });
  }

  /**
   * @method getGithubTeam
   * @description get a github team by slug or id
   * 
   * @param {String} teamSlugOrId 
   */
  async getGithubTeam(teamSlugOrId) {
    let collection = await this.githubTeamCollection();
    return collection.findOne({
      $or : [
        {slug: teamSlugOrId},
        {id : teamSlugOrId}
      ]
    });
  }

  /**
   * @method getAllGithubTeamNames
   * @description return all slug and ids for all teams in
   * github-team collection
   * 
   * @return {Promise} resolves to Array
   */
  async getAllGithubTeamNames() {
    let collection = await this.githubTeamCollection();
    return collection.find({}, {slug: 1, id: 1}).toArray();
  }

  /**
   * @method setDoiRequest
   * @description start a doi request
   * 
   * @param {String} pkgId package id to request doi for
   * @param {String} tag version name
   * @param {String} username username of requestor
   * @param {String} snapshot filename of code snapshot
   * 
   * @returns {Promise}
   */
  async setDoiRequest(pkgId, tag, username, email, snapshot) {
    let collection = await this.getDoiCollection();
    return collection.insert({
      id : pkgId,
      tag,
      state : config.doi.states.pendingApproval,
      history : [{
        timestamp : Date.now(),
        state: config.doi.states.pendingApproval,
        requestedBy : username,
        requestedByEmail : email
      }],
      snapshot,
      requestedBy : username
    });
  }

  /**
   * @method setDoiRequestState
   * @description update a doi request state
   * 
   * @param {Object} update update object
   * @param {String} update.pkgId package id to request doi for
   * @param {String} update.tag version name
   * @param {String} update.state new doi state 
   * @param {String} update.doi doi # to be applied
   * @param {String} update.username username making update
   * @param {String} update.email email of user making update
   * @param {String} update.admin admin username making update
   * @param {String} update.message either a custom message or the DOI # if state is applied
   * @param {String} update.snapshot name of doi snapshot
   * 
   * @returns {Promise}
   */
  async setDoiRequestState(update) {
    let history = Object.assign({}, update);
    delete history.pkgId;
    delete history.tag;
    history.timestamp = Date.now();

    let query = {
      '$set' : {
        state : update.state
      },
      '$push' : {history},
    };

    if( update.username ) {
      query['$set'].requestedBy = update.username;
      history.requestedBy = history.username;
      delete history.username;

      if( update.email ) {
        query['$set'].requestedByEmail = update.email;
        history.requestedByEmail = history.email;
        delete history.email;
      }

    } else if( update.admin ) {
      query['$set'].admin = update.admin;
    } else {
      throw new Error('Doi state update requires a admin username or user username');
    }

    if( update.state === config.doi.states.applied ) {
      if( !update.doi ) throw new Error(`Doi set to ${config.doi.states.applied} but no DOI provided`);
      query['$set'].doi = update.doi;
    }
    if( update.snapshot ) {
      query['$set'].snapshot = update.snapshot;
    }
    if( update.message ) {
      query['$set'].message = update.message;
    }

    let collection = await this.getDoiCollection();
    return collection.update({id: update.pkgId, tag: update.tag}, query);
  }

  /**
   * @method getDoiRequest
   * @description get a doi request state
   * 
   * @param {String} pkgId package id
   * @param {String} tag version name
   * 
   * @returns {Promise} resolves to mongodb results
   */
  async getDoiRequest(pkgId, tag) {
    let collection = await this.getDoiCollection();
    let query = {id: pkgId};
    if( tag ) {
      query.tag = tag;
      return collection.findOne(query);
    }
    return collection.find(query).toArray();
  }

  /**
   * @method getAppliedPackageDois
   * @description get the applied dois for a package
   * 
   * @param {String} pkgId 
   */
  async getAppliedPackageDois(pkgId) {
    let collection = await this.getDoiCollection();
    return collection.find(
      {id: pkgId, state:'applied'},
      {tag:1,doi:1,_id:0}
    ).toArray();
  }

  /**
   * @method getPendingDois
   * @description get all dois that have not been approved
   */
  async getPendingDois() {
    let collection = await this.getDoiCollection();
    return collection.find({state: {'$ne': config.doi.states.applied}}).toArray();
  }

  /**
   * @method getDoi
   * @description get a doi object from a doi string id
   * 
   * @param {String} doi identifier
   */
  async getDoi(doi) {
    doi = doi.replace(/^doi:/, '');
    let collection = await this.getDoiCollection();
    return collection.findOne({doi});
  }

  /**
   * @method getApprovedDois
   * @description get all dois that have been approved
   */
  async getApprovedDois() {
    let collection = await mongo.getDoiCollection();
    return collection.find({state: config.doi.states.applied}).toArray();
  }

  /**
   * @method updateStats
   * @description update stats via mapreduce. Should be called
   * any time package updates
   * 
   * @return {Promise}
   */
  async updateStats() {
    let collection = await this.packagesCollection();
    return statsMapReduce(collection);
  }

  /**
   * @method getStats
   * @description get all stats in stats collection
   * 
   * @return {Promise} resolve to array
   */
  async getStats() {
    let collection = await this.getStatsCollection();
    let results = await collection.find({}).toArray();
    if( !results.length ) {
      return [{value: {
        organizations : [],
        keywords : [],
        themes : []
      }}]
    }
    return results;
  }

}

module.exports = new MongoDB();