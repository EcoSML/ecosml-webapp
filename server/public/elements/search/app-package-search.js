import {Element as PolymerElement} from "@polymer/polymer/polymer-element"

import template from "./app-package-search"

class AppPackageSearch extends PolymerElement {

  static get template() {
    return template;
  }

}

customElements.define('app-package-search', AppPackageSearch);