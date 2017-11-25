const {BaseStore} = require('@ucd-lib/cork-app-utils');

class SearchStore extends BaseStore {

  constructor() {
    super();

    this.data = {}

    this.events = {
      'SEARCH_PACKAGES_UPDATE' : 'search-packages-update'
    }
  }

  setSearchLoading(request, payload) {
    this._setSearchState({request, payload, state: this.STATE.LOADING});
  }

  setSearchSuccess(payload) {
    this._setSearchState({payload, state: this.STATE.LOADED});
  }

  setSearchError(error) {
    this._setSearchState({error, state: this.STATE.ERROR});
  }

  _setSearchState(state) {
    this.data.create = state;
    this.emit(this.events.SEARCH_PACKAGES_UPDATE, this.data.create);
  }
}

module.exports = new SearchStore();