const {AppStateModel} = require('@ucd-lib/cork-app-state');
var AppStateStore = require('../stores/AppStateStore');
const PackageModel = require('../models/PackageModel');
const jsonldTransform = require('../../../lib/jsonld');

class AppStateModelImpl extends AppStateModel {

  constructor() {
    super();
    this.store = AppStateStore;

    // check for client testing flag
    let qs = parseQs();
    if( qs['integration-testing'] ) {
      window.INTEGRATION_TESTING = {};
    }

    this.seoPackageId = '';
    this.analyticsLocation = '';
  }

  async set(state) {
    this.seo(state);
    this.analytics(state);
    super.set(state);
  }

  analytics(state) {
    if( window.gtag === undefined ) return;
    if( APP_CONFIG.googleAnalyticsKey === undefined ) return;
    if( this.analyticsLocation === state.location.pathname ) return;
    this.analyticsLocation = state.location.pathname;
    gtag('config', APP_CONFIG.googleAnalyticsKey, {'page_path': state.location.pathname});
  }

  async seo(state) {
    let p = state.location.path || [];

    if( p.length >= 2 && p[0] === 'package' ) {
      
      if( p[1] !== this.seoPackageId ) {
        let pkg = await PackageModel.get(p[1]);
        pkg = JSON.stringify(jsonldTransform(pkg.payload), '  ', '  ');
        this.seoPackageId = p[1];
        document.querySelector('#jsonld').innerHTML = pkg;
      }
    } else {
      this.seoPackageId = '';
      document.querySelector('#jsonld').innerHTML = '';
    }
  }

}

function parseQs(url) {
  if(!url) url = location.search;
  var query = url.substr(1);
  var result = {};
  if( !query ) return result;

  query.split("&").forEach(function(part) {
    var item = part.split("=");
    if( item.length > 1 ) result[item[0]] = decodeURIComponent(item[1]);
    else result[item[0]] = true;
  });
  return result;
}

module.exports = new AppStateModelImpl();