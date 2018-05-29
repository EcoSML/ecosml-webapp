import {PolymerElement, html} from "@polymer/polymer"
import template from "./app-example-editor.html"

import PackageInterface from "../../interfaces/PackageInterface"

export default class AppExampleEditor extends Mixin(PolymerElement)
  .with(EventInterface, PackageInterface) {

  static get template() {
    return html([template]);
  }

  static get properties() {
    return {
      open : {
        type : Boolean,
        value : false,
        observer : '_onOpenChange'
      },

      directory : {
        type : String,
        value : ''
      },

      label : {
        type : String,
        value : '',
        observer : "_onLabelChange"
      },

      disabled : {
        type : Boolean,
        value : false
      },

      inputDir : {
        type : String,
        value : ''
      },

      outputDir : {
        type : String,
        value : ''
      },

      transformDir : {
        type : String,
        value : ''
      },

      creating : {
        type : Boolean,
        value : false
      },

      language : {
        type : String,
        value : '',
        observer : '_onLanguageUpdate'
      }
    }
  }

  constructor() {
    super();
    this.active = true;
    this._updatePanelHeight = this._updatePanelHeight.bind(this);
  }

  attachedCallback() {
    super.attachedCallback();
    window.addEventListener('resize', this._updatePanelHeight);
  }

  dettachedCallback() {
    super.dettachedCallback();
    window.removeEventListener('resize', this._updatePanelHeight);
  }

  /**
   * @method toggle
   * @description toggle visibility of main panel
   */
  toggle() {
    this.open = !this.open;
  }

  /**
   * @method _onOpenChange
   * @description fired from property observer.  called when open value changes
   */
  _onOpenChange() {
    this._updatePanelHeight();
  }

  /**
   * @method _updatePanelHeight
   * @description make sure main panel is set to correct height
   */
  _updatePanelHeight() {
    if( !this.open ) this.$.panel.style.display = 'none';
    else this.$.panel.style.display = 'block';
  }

  /**
   * @method _onFileUpdate
   * @description via PackageInterface, called whenever a file is updated
   * 
   * @param {Object} e 
   */
  _onFileUpdate(e) {
    if( e.payload.dir.indexOf(this.directory) !== 0 ) return;

    this.creating = false;
    this._updatePanelHeight();
  }

  /**
   * @method _onExampleNameChange
   * @description fired from the name input on-change event
   */
  async _onExampleNameChange() {
    if( this.creating ) {
      return this.label = this._cleanLabelName(this.$.name.value);
    }

    let src = this.label;
    let dst = this._cleanLabelName(this.$.name.value);
    let packageId = this._getSelectedPackageId().id;
    
    this.$.name.disabled = true;
    let helpTxt = this.$.name.help;
    this.$.name.help = 'Renaming example ...';
    this.disabled = true;

    try {
      await this._moveExampleDirectory(packageId, src, dst);

      // remove all old files
      ['input', 'transform', 'output'].forEach(id => {
        this.$[id].removeByBasePath(`/examples/${src}`);
      });
    } catch(e) {
      // noop?
    }

    this.disabled = false;
    this.$.name.disabled = false;
    this.$.name.help = helpTxt;
    this.label = dst;
  }

  async _onDeleteClicked() {
    try {
      this._deleteExampleDirectory(packageId, this.label);
    } catch(e) {
      // noop?
    }

    this.fire('example-deleted', {label: this.label});
  }

  _onLabelChange() {
    this.$.name.value = this.label;
    this.directory = '/examples/'+this.label;
    this.inputDir = this.directory+'/input';
    this.outputDir = this.directory+'/output';
    this.transfromDir = this.directory+'/transform';
  }

  /**
   * @method _onLanguageUpdate
   * @description called when the language property updates.  Used to hide/show
   * file uploads that are tied to a specific language.
   */
  _onLanguageUpdate() {
    let eles = this.shadowRoot.querySelectorAll('.language');
    for( var i = 0; i < eles.length; i++ ) eles[i].style.display = 'none';
    if( !this.language ) return;

    eles = this.shadowRoot.querySelectorAll(`.language.${this.language}`);
    for( var i = 0; i < eles.length; i++ ) eles[i].style.display = 'block';
  }

  _cleanLabelName(txt) {
    return txt.toLowerCase()
      .replace(/( |-)/g, '_')
      .replace(/\W/g, '');
  }

}

customElements.define('app-example-editor', AppExampleEditor);