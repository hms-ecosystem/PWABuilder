import { LitElement, css, html } from 'lit';

import { customElement, property, query } from 'lit/decorators.js';

import { hidden } from '../utils/css/hidden';
import { fastButtonCss } from '../utils/css/fast-elements';
import { FileInputDetails, Lazy } from '../utils/interfaces';
import { ifDefined } from 'lit/directives/if-defined.js';

import { FileInputElement } from '../utils/interfaces.components';

@customElement('app-file-input')
export class FileInput extends LitElement implements FileInputElement {
  @property({ type: String, attribute: true }) inputId = '';
  @query('.file-input') fileInput: Lazy<HTMLInputElement>;

  static get styles() {
    return [
      css`
        [appearance='lightweight'] {
          box-shadow: none;
        }
      `,
      hidden,
      fastButtonCss,
    ];
  }

  get input(): any {
    return this.fileInput;
  }

  get value(): any {
    return this.fileInput?.value;
  }

  get files(): any {
    return this.fileInput?.files || undefined;
  }

  constructor() {
    super();
  }

  render() {
    return html`
      <div>
        <fast-button class="file-button" appearance="lightweight" @click=${this.clickModalInput}>
          ${this.buttonText()}
        </fast-button>
        <input id="${ifDefined(this.inputId)}" class="file-input hidden" type="file" aria-hidden="true"
          @change=${this.handleModalInputFileChosen} />
      </div>
    `;
  }

  clickModalInput() {
    this.fileInput?.click();
  }

  buttonText() {
    if (this.input?.files?.length) {
      return this.input?.files?.item(0)?.name;
    }

    return 'Choose File';
  }

  handleModalInputFileChosen() {
    if (this.input) {
      const changeEvent = new CustomEvent<FileInputDetails>('input-change', {
        detail: {
          input: this.input,
        },
        composed: true,
        bubbles: true,
      });

      this.dispatchEvent(changeEvent);
      this.requestUpdate();
    }
  }
}
