import {PolymerElement, html} from "@polymer/polymer"
import template from "./app-files.html"

import "./app-file-manager"
import "./app-example-editor"

export default class AppFiles extends PolymerElement {

  static get template() {
    return html([template]);
  }

  static get properties() {
    return {
      files : {
        type : Object,
        value : () => {},
        observer : '_onFilesUpdate'
      },

      examples : {
        type : Array,
        value : () => []
      },

      language : {
        type : String,
        value : ''
      },

      packageName : {
        type : String,
        value : ''
      }
    }
  }

  /**
   * @method _onFilesUpdate
   * @description called when files updates
   */
  _onFilesUpdate() {
    if( !this.files ) return;

    let examples = {};
    for( let id in this.files ) {
      if( id.match(/^\/examples\//) ) {
        let name = id.replace(/^\/examples\//, '').split('/')[0];
        examples[name] = true;
      }
    }

    Object.keys(examples).forEach(example => {
      this.push('examples', {
        directory : '/examples/'+example, 
        label : example,
      });
    });
  }
  

  /**
   * @method _onCreateExampleClicked
   * @description bound to examples create button
   */
  _onCreateExampleClicked() {
    let len = this.examples.length+1;
    this.push('examples', {
      directory : '/examples/package_example_'+len, 
      label : 'package_example_'+len,
      isNew : true
    });
  }

  _onChange(e) {
    console.log(e);
  }

}

customElements.define('app-files', AppFiles);