import {Element as PolymerElement} from "@polymer/polymer/polymer-element"
import template from "./app-filter-panel.html"
import SearchInterface from "../../interfaces/SearchInterface"

export default class AppFilterPanel extends Mixin(PolymerElement)
  .with(EventInterface, SearchInterface) {

  static get template() {
    return template;
  }

  static get properties() {
    return {
      filter : {
        type : Object,
        value : () => {},
        observer : '_onFilterUpdate'
      }
    }
  }

  constructor() {
    super();
    this.active = true;
  }

  _onFilterUpdate() {
    // console.log(this.filter);
  }

  /**
   * @method _onFilterClicked
   * @private
   * @description fired when app-filter-checkbox is clicked by user
   */
  _onFilterClicked(e) {
    this._appendSearchFilter(this.filter.key, e.currentTarget.getAttribute('filter'));
    this._searchPackages();
  }


}

customElements.define('app-filter-panel', AppFilterPanel);