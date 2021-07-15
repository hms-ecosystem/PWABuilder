import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import '../components/loading-button';
import { tooltip, styles as ToolTipStyles } from '../components/tooltip';

//@ts-ignore
import style from '../../../styles/form-styles.css';
//@ts-ignore
import ModalStyles from '../../../styles/modal-styles.css';
import { getManifestGuarded } from '../services/manifest';
import { createHuaweiPackageOptionsFromManifest, publishAGAPK } from '../services/publish/huawei-publish';
import { AndroidApkOptions } from '../utils/android-validation';

import { smallBreakPoint, xxLargeBreakPoint } from '../utils/css/breakpoints';
import { Manifest } from '../utils/interfaces';
import { localeStrings } from '../../locales';

@customElement('huawei-form')
export class AndroidForm extends LitElement {
  @property({ type: Boolean }) generating: boolean = false;

  @state() show_adv = false;
  @state() show_analytics_kit = false;
  @state() show_push_kit = false;
  @state() show_ads_kit = false;
  @state() show_agc = false;

  // manifest form props
  @state() signingKeyFullName = 'John Doe';
  @state() organization = 'My Company';
  @state() organizationalUnit = 'Engineering';
  @state() countryCode = 'US';
  @state() keyPassword = '';
  @state() storePassword = '';
  @state() alias = 'my-key-alias';
  @state() file: string | undefined = undefined;
  @state() signingMode = 'new';
  @state() aGConnectServicesJSON = '';
  @state() agcs = '';
  @state() clientId = '';
  @state() clientKey = '';
  @state() appId = '';

  @state() default_options: AndroidApkOptions | undefined;

  form: HTMLFormElement | undefined;
  currentManifest: Manifest | undefined;
  maxKeyFileSizeInBytes = 2097152;

  static get styles() {
    return [
      style,
      ModalStyles,
      ToolTipStyles,
      css`
        #form-layout input {
          border: 1px solid rgba(194, 201, 209, 1);
          border-radius: var(--input-radius);
          padding: 10px;
          color: var(--font-color);
        }

        #generate-submit {
          background: transparent;
          color: var(--button-font-color);
          font-weight: bold;
          border: none;
          cursor: pointer;

          height: var(--desktop-button-height);
          width: var(--button-width);
        }

        #agConfig {
          padding: 10px;
        }

        @media (min-height: 760px) and (max-height: 1000px) {
          form {
            width: 100%;
          }
        }

        h4 {
          margin: 6px 0 0 0;
        }

        .hwLabel {
          color: #000000;
          font-size: 16px !important;
        }

        .hms {
          width: 20px;
          height: 20px;
        }

        .tabs {
          background-color: #FFFFFF;
          border: 1px solid #cfcfcf;
          border-radius: 8px;
          padding: 20px;
        }

        .tabsLabel {
          border: 1px solid #cfcfcf;
          border-top-right-radius: 8px;
          border-top-left-radius: 8px;
          border-bottom-left-radius: 0px;
          border-bottom-right-radius: 0px;
        }

        #appIdInput {
          width: 180px;
        }

        #agApk {
          width: 180px;
        }

        input[type="file"]{
          font-size:11px !important;
        }

        #whitelist, #hms-kits, #hms-ads-bottom-banner-id,
        #hms-ads-top-banner-id, #hms-ads-splash-id {
          background-color: #e1e1e1;
        }

        #hmsAdsSplashId::part(control), #hmsAdsTopBannerId::part(control),
        #hmsAdsBottomBannerId::part(control), #allowlist::part(control),
        #clientId::part(control), #clientIdInput::part(control), 
        #clientKey::part(control), #clientKeyInput::part(control), 
        #appId::part(control), #appIdInput::part(control) {
          background-color: #FFFFFF;
          color: #000000 !important;
        }

        #hmsAdsSplashId::part(host) {
          background-color: none;
        }

        .publishButton {
          background-color: #292c3a;
          color: #FFFFFF;
          padding: 12px 30px;
          border-radius: 23px;
          border: none;
          margin: 20px auto;
          position: relative;
          font-weight: bold;
          width: 180px;
          text-align: center;
        }

        ::part(root) {
          background: none !important;
        }

        ${xxLargeBreakPoint(
          css`
            #form-layout {
              max-height: 17em;
            }
          `
        )}

        ${smallBreakPoint(
          css`
            #form-layout {
              max-height: 20em;
            }
          `
        )}
      `,
    ];
  }

  constructor() {
    super();
  }

  async firstUpdated() {
    const form = this.shadowRoot?.querySelector(
      '#huawei-options-form'
    ) as HTMLFormElement;

    if (form) {
      this.form = form;
    }

    this.currentManifest = await getManifestGuarded();

    this.default_options = await createHuaweiPackageOptionsFromManifest();
    this.default_options.hmsAdsSplashId = '';
    this.default_options.hmsAdsTopBannerId = '';
    this.default_options.hmsAdsBottomBannerId = '';
    this.default_options.allowlist = '';
    this.default_options.clientId = '';
    this.default_options.clientKey = '';
    this.default_options.appId = '';
  }

  initGenerate(ev: InputEvent) {
    ev.preventDefault();

    this.dispatchEvent(
      new CustomEvent('init-huawei-gen', {
        detail: {
          form: this.form,
          signingFile: this.file,
        },
        composed: true,
        bubbles: true,
      })
    );
  }

  toggleSettings(settingsToggleValue: 'basic' | 'advanced') {
    if (settingsToggleValue === 'advanced') {
      this.show_adv = true;
    } else if (settingsToggleValue === 'basic') {
      this.show_adv = false;
    } else {
      this.show_adv = false;
    }
  }

  opened(targetEl: EventTarget | null) {
    if (targetEl) {
      const flipperButton = (targetEl as Element).classList.contains(
        'flipper-button'
      )
        ? (targetEl as Element)
        : (targetEl as Element).querySelector('.flipper-button');

      if (flipperButton) {
        if (flipperButton.classList.contains('opened')) {
          flipperButton.animate(
            [
              {
                transform: 'rotate(0deg)',
              },
            ],
            {
              duration: 200,
              fill: 'forwards',
            }
          );

          flipperButton.classList.remove('opened');
        } else {
          flipperButton.classList.add('opened');

          flipperButton.animate(
            [
              {
                transform: 'rotate(0deg)',
              },
              {
                transform: 'rotate(90deg)',
              },
            ],
            {
              duration: 200,
              fill: 'forwards',
            }
          );
        }
      }
    }
  }

  /**
   * Called when the user changes the signing mode.
   */
  androidSigningModeChanged(mode: 'mine' | 'new' | 'none') {
    if (!this.form) {
      return;
    }

    this.signingMode = mode;

    // If the user chose "mine", clear out existing values.
    if (mode === 'mine' || mode === 'none') {
      this.alias = '';
      this.signingKeyFullName = '';
      this.organization = '';
      this.organizationalUnit = '';
      this.countryCode = '';
      this.keyPassword = '';
      this.storePassword = '';
    } else if (mode === 'new') {
      this.alias = 'my-key-alias';
      this.signingKeyFullName = `${
        this.currentManifest?.short_name || this.currentManifest?.name || 'App'
      } Admin`;
      this.organization = this.currentManifest?.name || 'PWABuilder';
      this.organizationalUnit = 'Engineering';
      this.countryCode = 'US';
      this.keyPassword = '';
      this.storePassword = '';
      this.file = undefined;
    }
  }

  androidSigningKeyUploaded(event: any) {
    if (!this.form) {
      return;
    }

    const filePicker = event as HTMLInputElement;

    if (filePicker && filePicker.files && filePicker.files.length > 0) {
      const keyFile = filePicker.files[0];
      // Make sure it's a reasonable size.
      if (keyFile && keyFile.size > this.maxKeyFileSizeInBytes) {
        console.error('Keystore file is too large.', {
          maxSize: this.maxKeyFileSizeInBytes,
          fileSize: keyFile.size,
        });
        this.signingMode = 'none';
      }
      // Read it in as a Uint8Array and store it in our signing object.
      const fileReader = new FileReader();
      fileReader.onload = () => {
        this.file = fileReader.result as string;
        return;
      };
      fileReader.onerror = progressEvent => {
        console.error(
          'Unable to read keystore file',
          fileReader.error,
          progressEvent
        );
        this.file = undefined;
        if (this.form) {
          this.signingMode = 'none';
        }
      };
      fileReader.readAsDataURL(keyFile as Blob);
    }
  }

  onAGCSFileChange(e: any){
    let files = e.target.files || e.dataTransfer.files;
    if (!files.length) return;
    this.readAGCSFile(files[0]).then(
      data => {
        this.form.aGConnectServicesJSON.value = data;
        console.log(JSON.stringify(data));
        // this.validateAGCJson();
      }
    ).then(
      this.getBase64(files[0]).then(
        data => {
          this.form.agcs.value = data;
          // console.log(JSON.stringify(this.form.agcs.value));
        }
      )
    ).catch(err => console.error(err));
  }

  readAGCSFile(file: any) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.readAsText(file);
      reader.onload = (e: any) => resolve(JSON.parse(e.target.result));
      reader.onerror = error => reject(error);
    })
  }

  getBase64(file: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  getAGAPK(e: any) {
    let file = e.target.files || e.dataTransfer.files;
    if (!file.length) return;
    this.getBase64(file[0]).then(
      data => {
        // console.log(data);
        this.form.apk.value = data;
      }
    ).catch(err => console.error(err));
  }

  publishAppGalleryAPK() {
    if(this.clientId.length === 0) {

      return;
    }
    if(this.clientKey.length === 0) {

      return;
    } 
    if(this.appId.length === 0) {

      return;
    }
    let payload = {
      client_id: this.clientId,
      client_key: this.clientKey,
      app_id: this.appId,
      apk: this.form.apk.value
    }
    publishAGAPK(payload);
  }

  setInput(input: string, value: string) {
    this[input] = value;
  }

  checkAdsKit() {
    if(!this.show_ads_kit){
      this.show_ads_kit = true;
    } else {
      this.show_ads_kit = false;
    }
    this.checkAGC();
  }

  checkPushKit() {
    if(!this.show_push_kit){
      this.show_push_kit = true;
    } else {
      this.show_push_kit = false;
    }
    this.checkAGC();
  }

  checkAnalyticsKit() {
    if(!this.show_analytics_kit){
      this.show_analytics_kit = true;
    } else {
      this.show_analytics_kit = false;
    }
    this.checkAGC();
  }

  checkAGC() {
    if(this.show_ads_kit || this.show_analytics_kit || this.show_push_kit){
      this.show_agc = true;
    } else {
      this.show_agc = false;
    }
  }

  render() {
    return html`
      <form
        id="huawei-options-form"
        slot="modal-form"
        style="width: 100%"
        @submit="${(ev: InputEvent) => this.initGenerate(ev)}"
        title=""
      >
        <div id="form-layout">
          <div class="basic-settings">
            <div class="form-group">
              <label for="packageIdInput">
                Package ID
                <i
                  class="fas fa-info-circle"
                  title="The unique identifier of your app. It should contain only letters, numbers, and periods. Example: com.companyname.appname"
                  aria-label="The unique identifier of your app. It should contain only letters, numbers, and periods. Example: com.companyname.appname"
                  role="definition"
                ></i>

                ${tooltip(
                  'android-package-name',
                  'The unique identifier of your app. It should contain only letters, numbers, and periods. Example: com.companyname.appname'
                )}
              </label>
              <input
                id="packageIdInput"
                class="form-control"
                placeholder="com.contoso.app"
                value="${this.default_options
                  ? this.default_options.packageId
                  : 'com.contoso.app'}"
                type="text"
                required
                pattern="[a-zA-Z0-9._]*$"
                name="packageId"
              />
            </div>

            <div class="form-group">
              <label for="appNameInput">App name</label>
              <input
                type="text"
                class="form-control"
                id="appNameInput"
                placeholder="My Awesome PWA"
                value="${this.default_options
                  ? this.default_options.name
                  : ' My Awesome PWA'}"
                required
                name="appName"
              />
            </div>

            <div class="form-group">
              <label for="appLauncherNameInput">
                Launcher name
                <i
                  class="fas fa-info-circle"
                  title="The app name used on the Android launch screen. Typically, this is the short name of the app."
                  aria-label="The app name used on the Android launch screen. Typically, this is the short name of the app."
                  role="definition"
                ></i>

                ${tooltip(
                  'android-launcher-name',
                  'The app name used on the Android launch screen. Typically, this is the short name of the app.'
                )}
              </label>
              <input
                type="text"
                class="form-control"
                id="appLauncherNameInput"
                placeholder="Awesome PWA"
                value="${this.default_options
                  ? this.default_options.launcherName
                  : 'Awesome PWA'}"
                required
                name="launcherName"
              />
            </div>
          </div>

          <!-- right half of the options dialog -->
          <fast-accordion>
            <fast-accordion-item
              @click="${(ev: Event) => this.opened(ev.target)}"
            >
              <div id="all-settings-header" slot="heading">
                <span>All Settings</span>

                <fast-button class="flipper-button" mode="stealth">
                  <ion-icon name="caret-forward-outline"></ion-icon>
                </fast-button>
              </div>

              <div class="adv-settings">
                <div>
                  <div class="">
                    <div class="form-group">
                      <label for="appVersionInput">
                        App version
                        <i
                          class="fas fa-info-circle"
                          title="The version of your app displayed to users. This is a string, typically in the form of '1.0.0.0'. Maps to android:versionName."
                          aria-label
                          role="definition"
                        ></i>

                        ${tooltip(
                          'android-version',
                          "The version of your app displayed to users. This is a string, typically in the form of '1.0.0.0'. Maps to android:versionName."
                        )}
                      </label>
                      <input
                        type="text"
                        class="form-control"
                        id="appVersionInput"
                        placeholder="1.0.0.0"
                        value="${this.default_options?.appVersion || '1.0.0.0'}"
                        required
                        name="appVersion"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div class="">
                  <div class="form-group">
                    <label for="appVersionCodeInput">
                      <a
                        href="https://developer.android.com/studio/publish/versioning#appversioning"
                        target="_blank"
                        rel="noopener"
                        tabindex="-1"
                        >App version code</a
                      >
                      <i
                        class="fas fa-info-circle"
                        title="A positive integer used as an internal version number. This is not shown to users. Android uses this value to protect against downgrades. Maps to android:versionCode."
                        aria-label="A positive integer used as an internal version number. This is not shown to users. Android uses this value to protect against downgrades. Maps to android:versionCode."
                        role="definition"
                        style="margin-left: 5px;"
                      ></i>

                      ${tooltip(
                        'android-version-code',
                        'A positive integer used as an internal version number. This is not shown to users. Android uses this value to protect against downgrades. Maps to android:versionCode.'
                      )}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="2100000000"
                      class="form-control"
                      id="appVersionCodeInput"
                      name="appVersionCode"
                      placeholder="1"
                      required
                      value="${this.default_options?.appVersionCode || 1}"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div class="">
                  <div class="form-group">
                    <label for="hostInput">Host</label>
                    <input
                      type="url"
                      class="form-control"
                      id="hostInput"
                      placeholder="https://mysite.com"
                      required
                      name="host"
                      value="${this.default_options
                        ? this.default_options.host
                        : 'https://mysite.com'}"
                    />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="startUrlInput">
                  Start URL
                  <i
                    class="fas fa-info-circle"
                    title="The start path for the TWA. Must be relative to the Host URL. You can specify '/' if you don't have a start URL different from Host."
                    aria-label="The start path for the TWA. Must be relative to the Host URL."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'android-start-url',
                    "The start path for the TWA. Must be relative to the Host URL. You can specify '/' if you don't have a start URL different from Host."
                  )}
                </label>
                <!-- has to be a text type as / is not a valid URL in the input in the spec -->
                <input
                  type="text"
                  class="form-control"
                  id="startUrlInput"
                  placeholder="/index.html"
                  required
                  name="startUrl"
                  value="${this.default_options
                    ? this.default_options.startUrl
                    : '/'}"
                />
              </div>

              <div class="form-group">
                <label for="themeColorInput">
                  Status bar color
                  <i
                    class="fas fa-info-circle"
                    title="Also known as the theme color, this is the color of the Android status bar in your app. Note: the status bar will be hidden if Display Mode is set to fullscreen."
                    aria-label="Also known as the theme color, this is the color of the Android status bar in your app. Note: the status bar will be hidden if Display Mode is set to fullscreen."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'android-status-bar-color',
                    'Also known as the theme color, this is the color of the Android status bar in your app. Note: the status bar will be hidden if Display Mode is set to fullscreen.'
                  )}
                </label>
                <input
                  type="color"
                  class="form-control"
                  id="themeColorInput"
                  name="themeColor"
                  value="${this.default_options
                    ? this.default_options.themeColor
                    : 'black'}"
                />
              </div>

              <div class="form-group">
                <label for="bgColorInput">
                  Splash color
                  <i
                    class="fas fa-info-circle"
                    title="Also known as background color, this is the color of the splash screen for your app."
                    aria-label="Also known as background color, this is the color of the splash screen for your app."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'android-splash-color',
                    'Also known as background color, this is the color of the splash screen for your app.'
                  )}
                </label>
                <input
                  type="color"
                  class="form-control"
                  id="bgColorInput"
                  name="backgroundColor"
                  value="${this.default_options
                    ? this.default_options.backgroundColor
                    : 'black'}"
                />
              </div>

              <div class="form-group">
                <label for="navigationColorInput">
                  Nav color
                  <i
                    class="fas fa-info-circle"
                    title="The color of the Android navigation bar in your app. Note: the navigation bar will be hidden if Display Mode is set to fullscreen."
                    aria-label="The color of the Android navigation bar in your app. Note: the navigation bar will be hidden if Display Mode is set to fullscreen."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'android-nav-color',
                    'The color of the Android navigation bar in your app. Note: the navigation bar will be hidden if Display Mode is set to fullscreen.'
                  )}
                </label>
                <input
                  type="color"
                  class="form-control"
                  id="navigationColorInput"
                  name="navigationColor"
                  value="${this.default_options
                    ? this.default_options.navigationColor
                    : 'black'}"
                />
              </div>

              <div class="form-group">
                <label for="navigationColorDarkInput">
                  Nav dark color
                  <i
                    class="fas fa-info-circle"
                    title="The color of the Android navigation bar in your app when Android is in dark mode."
                    aria-label="The color of the Android navigation bar in your app when Android is in dark mode."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'android-nav-color-dark',
                    'The color of the Android navigation bar in your app when Android is in dark mode.'
                  )}
                </label>
                <input
                  type="color"
                  class="form-control"
                  id="navigationColorDarkInput"
                  name="navigationColorDark"
                  value="${this.default_options
                    ? this.default_options.navigationColorDark
                    : 'black'}"
                />
              </div>

              <div class="form-group">
                <label for="navigationDividerColorInput">
                  Nav divider color
                  <i
                    class="fas fa-info-circle"
                    title="The color of the Android navigation bar divider in your app."
                    aria-label="The color of the Android navigation bar divider in your app."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'android-divider-color',
                    'The color of the Android navigation bar divider in your app.'
                  )}
                </label>
                <input
                  type="color"
                  class="form-control"
                  id="navigationDividerColorInput"
                  name="navigationDividerColor"
                  value="${this.default_options
                    ? this.default_options.navigationDividerColor
                    : 'black'}"
                />
              </div>

              <div class="form-group">
                <label for="navigationDividerColorDarkInput">
                  Nav divider dark color
                  <i
                    class="fas fa-info-circle"
                    title="The color of the Android navigation navigation bar divider in your app when Android is in dark mode."
                    aria-label="The color of the Android navigation bar divider in your app when Android is in dark mode."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'android-divider-color-dark',
                    'The color of the Android navigation navigation bar divider in your app when Android is in dark mode.'
                  )}
                </label>
                <input
                  type="color"
                  class="form-control"
                  id="navigationDividerColorDarkInput"
                  name="navigationDividerColorDark"
                  value="${this.default_options
                    ? this.default_options.navigationDividerColorDark
                    : 'black'}"
                />
              </div>

              <div class="form-group">
                <label for="iconUrlInput">Icon URL</label>
                <input
                  type="url"
                  class="form-control"
                  id="iconUrlInput"
                  placeholder="https://myawesomepwa.com/512x512.png"
                  name="iconUrl"
                  value="${this.default_options
                    ? this.default_options.iconUrl
                    : ''}"
                />
              </div>

              <div class="form-group">
                <label for="maskIconUrlInput">
                  <a
                    href="https://web.dev/maskable-icon"
                    title="Read more about maskable icons"
                    target="_blank"
                    rel="noopener"
                    aria-label="Read more about maskable icons"
                    tabindex="-1"
                  >
                    Maskable icon URL
                  </a>
                  <i
                    class="fas fa-info-circle"
                    title="Optional. The URL to an icon with a minimum safe zone of trimmable padding, enabling rounded icons on certain Android platforms."
                    aria-label="Optional. The URL to an icon with a minimum safe zone of trimmable padding, enabling rounded icons on certain Android platforms."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'maskable-icon-url',
                    'Optional. The URL to an icon with a minimum safe zone of trimmable padding, enabling rounded icons on certain Android platforms.'
                  )}
                </label>
                <input
                  type="url"
                  class="form-control"
                  id="maskIconUrlInput"
                  placeholder="https://myawesomepwa.com/512x512-maskable.png"
                  name="maskableIconUrl"
                  .value="${this.default_options?.maskableIconUrl || ''}"
                />
              </div>

              <div class="form-group">
                <label for="monochromeIconUrlInput">
                  <a
                    href="https://w3c.github.io/manifest/#monochrome-icons-and-solid-fills"
                    target="_blank"
                    rel="noopener"
                    tabindex="-1"
                    >Monochrome icon URL</a
                  >
                  <i
                    class="fas fa-info-circle"
                    title="Optional. The URL to an icon containing only white and black colors, enabling Android to fill the icon with user-specified color or gradient depending on theme, color mode, or contrast settings."
                    aria-label="Optional. The URL to an icon containing only white and black colors, enabling Android to fill the icon with user-specified color or gradient depending on theme, color mode, or contrast settings."
                    role="definition"
                  ></i>

                  ${tooltip(
                    'mono-icon-url',
                    'Optional. The URL to an icon containing only white and black colors, enabling Android to fill the icon with user-specified color or gradient depending on theme, color mode, or contrast settings.'
                  )}
                </label>
                <input
                  type="url"
                  class="form-control"
                  id="monochromeIconUrlInput"
                  placeholder="https://myawesomepwa.com/512x512-monochrome.png"
                  name="monochromeIconUrl"
                  .value="${this.default_options?.monochromeIconUrl || ''}"
                />
              </div>

              <div class="form-group">
                <label for="webManifestUrlInput"> Manifest URL </label>
                <input
                  type="url"
                  class="form-control"
                  id="webManifestUrlInput"
                  placeholder="https://myawesomepwa.com/manifest.json"
                  name="webManifestUrl"
                  .value="${this.default_options?.webManifestUrl || ''}"
                />
              </div>

              <div class="form-group">
                <label for="splashFadeoutInput"
                  >Splash screen fade out duration (ms)</label
                >
                <input
                  type="number"
                  class="form-control"
                  id="splashFadeoutInput"
                  placeholder="300"
                  name="splashScreenFadeOutDuration"
                  value="${this.default_options
                    ? this.default_options.splashScreenFadeOutDuration
                    : '300'}"
                />
              </div>

              <div class="form-group">
                <label>${localeStrings.text.android.titles.fallback}</label>
                <div class="form-check">
                  <input
                    .defaultChecked="${true}"
                    value="customtabs"
                    class="form-check-input"
                    type="radio"
                    name="fallbackType"
                    id="fallbackCustomTabsInput"
                    name="fallbackType"
                  />
                  <label class="form-check-label" for="fallbackCustomTabsInput">
                    Custom Tabs
                    <i
                      class="fas fa-info-circle"
                      title="Use Chrome Custom Tabs as a fallback for your PWA when the full trusted web activity (TWA) experience is unavailable."
                      aria-label="When trusted web activity (TWA) is unavailable, use Chrome Custom Tabs as a fallback for your PWA."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'fallback-behavior',
                      'Use Chrome Custom Tabs as a fallback for your PWA when the full trusted web activity (TWA) experience is unavailable.'
                    )}
                  </label>
                </div>
                <div class="form-check">
                  <input
                    .defaultChecked="${false}"
                    value="webview"
                    class="form-check-input"
                    type="radio"
                    name="fallbackType"
                    id="fallbackWebViewInput"
                    value="webview"
                    name="fallbackType"
                  />
                  <label class="form-check-label" for="fallbackWebViewInput">
                    Web View
                    <i
                      class="fas fa-info-circle"
                      title="Use a web view as the fallback for your PWA when the full trusted web activity (TWA) experience is unavailable."
                      aria-label="When trusted web activity (TWA) is unavailable, use a web view as the fallback for your PWA."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'fallback-behavior',
                      'Use a web view as the fallback for your PWA when the full trusted web activity (TWA) experience is unavailable.'
                    )}
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label>${localeStrings.text.android.titles.display_mode}</label>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="displayMode"
                    id="standaloneDisplayModeInput"
                    .defaultChecked="${this.default_options
                      ? this.default_options.display === 'standalone'
                        ? true
                        : false
                      : false}"
                    value="standalone"
                    name="display"
                  />
                  <label
                    class="form-check-label"
                    for="standaloneDisplayModeInput"
                  >
                    Standalone
                    <i
                      class="fas fa-info-circle"
                      title="Your PWA will use the whole screen but keep the Android status bar and navigation bar."
                      aria-label="Your PWA will use the whole screen but keep the Android status bar and navigation bar."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'display-mode-standalone',
                      'Your PWA will use the whole screen but keep the Android status bar and navigation bar.'
                    )}
                  </label>
                </div>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="displayMode"
                    id="fullscreenDisplayModeInput"
                    .defaultChecked="${this.default_options
                      ? this.default_options.display === 'fullscreen'
                        ? true
                        : false
                      : false}"
                    value="fullscreen"
                    name="display"
                  />
                  <label
                    class="form-check-label"
                    for="fullscreenDisplayModeInput"
                  >
                    Fullscreen
                    <i
                      class="fas fa-info-circle"
                      title="Your PWA will use the whole screen and remove the Android status bar and navigation bar. Suitable for immersive experiences such as games or media apps."
                      aria-label="Your PWA will use the whole screen and remove the Android status bar and navigation bar. Suitable for immersive experiences such as games or media apps."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'display-mode-fullscreen',
                      'Your PWA will use the whole screen and remove the Android status bar and navigation bar. Suitable for immersive experiences such as games or media apps.'
                    )}
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label>${localeStrings.text.android.titles.notification}</label>
                <div class="form-check">
                  <input
                    .defaultChecked="${true}"
                    class="form-check-input"
                    type="checkbox"
                    id="enableNotificationsInput"
                    name="enableNotifications"
                  />
                  <label
                    class="form-check-label"
                    for="enableNotificationsInput"
                  >
                    Enable
                    <i
                      class="fas fa-info-circle"
                      title="Whether to enable Push Notification Delegation. If enabled, your PWA can send push notifications without browser permission prompts."
                      aria-label="Whether to enable Push Notification Delegation. If enabled, your PWA can send push notifications without browser permission prompts."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'push-delegation',
                      'Whether to enable Push Notification Delegation. If enabled, your PWA can send push notifications without browser permission prompts.'
                    )}
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label
                  >${localeStrings.text.android.titles
                    .location_delegation}</label
                >
                <div class="form-check">
                  <input
                    .defaultChecked="${true}"
                    class="form-check-input"
                    type="checkbox"
                    id="enableLocationInput"
                    name="locationDelegation"
                  />
                  <label class="form-check-label" for="enableLocationInput">
                    Enable
                    <i
                      class="fas fa-info-circle"
                      title="Whether to enable Location Delegation. If enabled, your PWA can acess navigator.geolocation without browser permission prompts."
                      aria-label="Whether to enable Location Delegation. If enabled, your PWA can acess navigator.geolocation without browser permission prompts."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'location-delegation',
                      'Whether to enable Location Delegation. If enabled, your PWA can acess navigator.geolocation without browser permission prompts.'
                    )}
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label
                  >${localeStrings.text.android.titles.settings_shortcut}</label
                >
                <div class="form-check">
                  <input
                    .defaultChecked="${true}"
                    class="form-check-input"
                    type="checkbox"
                    id="enableSettingsShortcutInput"
                    name="enableSiteSettingsShortcut"
                  />
                  <label
                    class="form-check-label"
                    for="enableSettingsShortcutInput"
                  >
                    Enable
                    <i
                      class="fas fa-info-circle"
                      title="If enabled, users can long-press on your app tile and a Settings menu item will appear, letting users manage space for your app."
                      aria-label="If enabled, users can long-press on your app tile and a Settings menu item will appear, letting users manage space for your app."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'settings-shortcut',
                      'If enabled, users can long-press on your app tile and a Settings menu item will appear, letting users manage space for your app.'
                    )}
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label
                  >${localeStrings.text.android.titles.chromeos_only}</label
                >
                <div class="form-check">
                  <input
                    .defaultChecked="${false}"
                    class="form-check-input"
                    type="checkbox"
                    id="chromeOSOnlyInput"
                    name="isChromeOSOnly"
                  />
                  <label class="form-check-label" for="chromeOSOnlyInput">
                    Enable
                    <i
                      class="fas fa-info-circle"
                      title="If enabled, your Android package will only run on ChromeOS devices"
                      aria-label="If enabled, your Android package will only run on ChromeOS devices"
                      role="definition"
                    ></i>

                    ${tooltip(
                      'chromeos-only',
                      'If enabled, your Android package will only run on ChromeOS devices'
                    )}
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label>${localeStrings.text.android.titles.source_code}</label>
                <div class="form-check">
                  <input
                    .defaultChecked="${false}"
                    class="form-check-input"
                    type="checkbox"
                    id="includeSourceCodeInput"
                    name="includeSourceCode"
                  />
                  <label class="form-check-label" for="includeSourceCodeInput">
                    Enable
                    <i
                      class="fas fa-info-circle"
                      title="If enabled, your download will include the source code for your Android app."
                      aria-label="If enabled, your download will include the source code for your Android app."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'include-source',
                      'If enabled, your download will include the source code for your Android app.'
                    )}
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label>${localeStrings.text.android.titles.signing_key}</label>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    id="generateSigningKeyInput"
                    value="new"
                    name="signingMode"
                    @change="${(ev: Event) =>
                      this.androidSigningModeChanged((ev.target as any).value)}"
                    .defaultChecked="${true}"
                  />
                  <label class="form-check-label" for="generateSigningKeyInput">
                    Create new
                    <i
                      class="fas fa-info-circle"
                      title="PWABuilder will generate a new signing key for you and sign your APK with it. Your download will contain the new signing key and passwords."
                      aria-label="PWABuilder will generate a new signing key for you and sign your APK with it. Your download will contain the new signing key and passwords."
                      role="definition"
                    ></i>

                    ${tooltip(
                      'signing-key-new',
                      'PWABuilder will generate a new signing key for you and sign your APK with it. Your download will contain the new signing key and passwords.'
                    )}
                  </label>
                </div>
              </div>

              ${this.signingMode === 'mine' || this.signingMode === 'new'
                ? html`
                    <div style="margin-left: 15px;">
                      ${this.signingMode === 'mine'
                        ? html`
                            <div class="form-group">
                              <label for="signingKeyInput">Key file</label>
                              <input
                                type="file"
                                class="form-control"
                                id="signingKeyInput"
                                @change="${(ev: Event) =>
                                  this.androidSigningKeyUploaded(ev.target)}"
                                accept=".keystore"
                                required
                                style="border: none;"
                                value="${ifDefined(this.file)}"
                              />
                            </div>
                          `
                        : null}

                      <div class="form-group">
                        <label for="signingKeyAliasInput">Key alias</label>
                        <input
                          type="text"
                          class="form-control"
                          id="signingKeyAliasInput"
                          placeholder="my-key-alias"
                          required
                          name="alias"
                          value="${this.alias}"
                        />
                      </div>

                      ${this.signingMode === 'new'
                        ? html`
                            <div class="form-group">
                              <label for="signingKeyFullNameInput"
                                >Key full name</label
                              >
                              <input
                                type="text"
                                class="form-control"
                                id="signingKeyFullNameInput"
                                required
                                placeholder="John Doe"
                                name="fullName"
                                value="${this.signingKeyFullName}"
                              />
                            </div>

                            <div class="form-group">
                              <label for="signingKeyOrgInput"
                                >Key organization</label
                              >
                              <input
                                type="text"
                                class="form-control"
                                id="signingKeyOrgInput"
                                required
                                placeholder="My Company"
                                name="organization"
                                value="${this.organization}"
                              />
                            </div>

                            <div class="form-group">
                              <label for="signingKeyOrgUnitInput"
                                >Key organizational unit</label
                              >
                              <input
                                type="text"
                                class="form-control"
                                id="signingKeyOrgUnitInput"
                                required
                                placeholder="Engineering Department"
                                name="organizationalUnit"
                                value="${this.organizationalUnit}"
                              />
                            </div>

                            <div class="form-group">
                              <label for="signingKeyCountryCodeInput">
                                Key country code
                                <i
                                  class="fas fa-info-circle"
                                  title="The 2 letter country code to list on the signing key"
                                  aria-label="The 2 letter country code to list on the signing key"
                                  role="definition"
                                ></i>

                                ${tooltip(
                                  'key-country-code',
                                  'The 2 letter country code to list on the signing key'
                                )}
                              </label>
                              <input
                                type="text"
                                class="form-control"
                                id="signingKeyCountryCodeInput"
                                required
                                placeholder="US"
                                name="countryCode"
                                value="${this.countryCode}"
                              />
                            </div>
                          `
                        : null}

                      <div class="form-group">
                        <label for="signingKeyPasswordInput">
                          Key password
                          <i
                            class="fas fa-info-circle"
                            title="The password for the signing key. Type a new password or leave empty to use a generated password."
                            aria-label="The password for the signing key. Type a new password or leave empty to use a generated password."
                            role="definition"
                          ></i>

                          ${tooltip(
                            'key-password',
                            'The password for the signing key. Type a new password or leave empty to use a generated password.'
                          )}
                        </label>
                        <input
                          type="password"
                          class="form-control"
                          id="signingKeyPasswordInput"
                          name="keyPassword"
                          placeholder="Password to your signing key"
                          minlength="6"
                          value="${this.keyPassword}"
                        />
                      </div>

                      <div class="form-group">
                        <label for="signingKeyStorePasswordInput">
                          Key store password
                          <i
                            class="fas fa-info-circle"
                            title="The password for the key store. Type a new password or leave empty to use a generated password."
                            aria-label="The password for the key store. Type a new password or leave empty to use a generated password."
                            role="definition"
                          ></i>

                          ${tooltip(
                            'keystore-password',
                            'The password for the key store. Type a new password or leave empty to use a generated password.'
                          )}
                        </label>
                        <input
                          type="password"
                          class="form-control"
                          id="signingKeyStorePasswordInput"
                          name="storePassword"
                          placeholder="Password to your key store"
                          minlength="6"
                          value="${this.storePassword}"
                        />
                      </div>
                    </div>
                  `
                : null}

              <fast-design-system-provider>
              <fast-design-system-provider>
                <fast-tabs activeId="entrees">
                  <fast-tab id="agConfig" class="tabsLabel">HMS Configs</fast-tab>
                  <fast-tab id="agPublish" class="tabsLabel">Publish to AppGallery</fast-tab>
                  <fast-tab-panel id="agConfig" class="tabs">
                    <table width="100%">
                      <tr>
                        <td>
                          <div class="form-group" style="display: table;">
                            <label for="hmsKits" class="hwLabel">
                              HMS Kits
                            </label>

                            <div style="float: left; position: relative; margin-right: 8px; margin-top: 10px; margin-bottom: 10px;">
                              <fast-card style="width: 108px; height: 140px;">
                                <div style="padding: 0 10px 10px; color: var(--neutral-foreground-rest);">
                                  <div style="width: 100%; float: left;">
                                    <h4>Analytics Kit</h4>
                                  </div>
                                  <div style="width: 100%; float: left; position: relative; text-align: right;">
                                    <input class="form-check-input hms" type="checkbox" id="hmsAnalyticsKit" name="hmsAnalyticsKit" @click="${this.checkPushKit}" />
                                  </div>
                                  <div style="width: 50px; height: 110px; z-index:2; position: relative; margin: auto; top: -10px; text-align: center;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 139.88 154.66"><defs><style>.cls-1{fill:#f3a641;}.cls-2{fill:#fff;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path class="cls-1" d="M139.53,47.63c0-6.05-4.36-13.45-9.62-16.44L79,2.21c-5.26-3-13.83-2.94-19,.12L9.43,31.91C4.21,35,0,42.41,0,48.46L.35,107c0,6,4.37,13.45,9.62,16.45l50.89,29c5.26,3,13.83,2.95,19-.11l50.54-29.58c5.23-3.06,9.47-10.51,9.43-16.56Z"/><path class="cls-2" d="M103.4,75.77a36.17,36.17,0,0,1-7.82,22l9.91,9.82c.88,1-4.23,6.18-5.3,5.3l-10.47-9.4a37.59,37.59,0,0,1-21.07,7.07A34.75,34.75,0,1,1,103.4,75.77Z"/><circle class="cls-1" cx="68.65" cy="75.77" r="30.79"/><circle class="cls-2" cx="68.65" cy="75.77" r="26.37"/><rect class="cls-1" x="55.96" y="68.09" width="4.74" height="19.6" rx="2"/><rect class="cls-1" x="66.22" y="60.82" width="4.74" height="26.87" rx="2"/><rect class="cls-1" x="76.49" y="72.72" width="4.74" height="14.98" rx="2"/></g></g></svg>
                                    <fast-anchor href="https://developer.huawei.com/consumer/en/hms/huawei-analyticskit" appearance="hypertext" target="_new">Learn more</fast-anchor>
                                  </div>
                                </div>
                              </fast-card>
                            </div>

                            <div style="float: left; position: relative; margin-right: 8px; margin-top: 10px; margin-bottom: 10px;">
                              <fast-card style="width: 108px; height: 140px;">
                                <div style="padding: 0 10px 10px; color: var(--neutral-foreground-rest);">
                                  <div style="width: 100%; float: left;">
                                    <h4>Ads Kit</h4>
                                  </div>
                                  <div style="width: 100%; float: left; position: relative; text-align: right;">
                                    <input class="form-check-input hms" type="checkbox" id="hmsAdsKit" name="hmsAdsKit" @click="${this.checkAdsKit}" />
                                  </div>
                                  <div style="width: 50px; height: 110px; z-index:2; position: relative; margin: auto; top: -10px; text-align: center;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 139.88 154.66"><defs><style>.cls-1{fill:#f3a641;}.cls-2{fill:#fff;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path class="cls-1" d="M139.53,47.63c0-6.05-4.36-13.45-9.62-16.44L79,2.21c-5.26-3-13.83-2.94-19,.12L9.43,31.91C4.21,35,0,42.41,0,48.46L.35,107c0,6,4.37,13.45,9.62,16.45l50.89,29c5.26,3,13.83,2.95,19-.11l50.54-29.58c5.23-3.06,9.47-10.51,9.43-16.56Z"/><polygon class="cls-2" points="70.98 37.9 28.37 105.81 113.6 105.81 70.98 37.9"/><polygon class="cls-1" points="70.98 60.91 42.81 105.81 99.16 105.81 70.98 60.91"/><polygon class="cls-2" points="70.98 80.53 55.12 105.81 86.85 105.81 70.98 80.53"/></g></g></svg>
                                    <fast-anchor href="https://developer.huawei.com/consumer/en/hms/huawei-adskit" appearance="hypertext" target="_new">Learn more</fast-anchor>
                                  </div>
                                </div>
                              </fast-card>
                            </div>

                            <div style="float: left; position: relative; margin-top: 10px; margin-bottom: 10px;">
                              <fast-card style="width: 108px; height: 140px;">
                                <div style="padding: 0 10px 10px; color: var(--neutral-foreground-rest);">
                                  <div style="width: 100%; float: left;">
                                    <h4>Push Kit</h4>
                                  </div>
                                  <div style="width: 100%; float: left; position: relative; text-align: right;">
                                    <input class="form-check-input hms" type="checkbox" id="hmsPushKit" name="hmsPushKit" @click="${this.checkAnalyticsKit}" />
                                  </div>
                                  <div style="width: 50px; height: 110px; z-index:2; position: relative; margin: auto; top: -10px; text-align: center;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 139.88 154.66"><defs><style>.cls-1{fill:#f3a641;}.cls-2{fill:#fefefe;}.cls-3{fill:#fefbf8;}.cls-4{fill:#fdf9f3;}.cls-5{fill:#fdf8f2;}.cls-6{fill:#f3a742;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><path class="cls-1" d="M139.53,47.63c0-6.05-4.36-13.45-9.62-16.44L79,2.21c-5.26-3-13.83-2.94-19,.12L9.43,31.91C4.21,35,0,42.41,0,48.46L.35,107c0,6,4.37,13.45,9.62,16.45l50.89,29c5.26,3,13.83,2.95,19-.11l50.54-29.58c5.23-3.06,9.47-10.51,9.43-16.56Z"/><path class="cls-2" d="M56.47,52.86c3,.41,6,0,8.87,1,2.22.82,4.21-.22,6.07-1.42,7.15-4.62,15-7.85,22.92-10.71a3.05,3.05,0,0,1,.46-.2c2.9-.51,6.42-1.92,8.57,0,2,1.79,0,5-.76,7.44-2.7,8.55-5.85,16.91-11.21,24.22A5.28,5.28,0,0,0,90.56,77c.15,1.82,0,3.74.49,5.45,2.6,8.35.18,14.82-6.7,20-2.44,1.85-4.44,4.29-6.65,6.47-1,1-2,2.4-3.78,1.84s-1.51-2.34-1.64-3.77c-.26-2.64-.38-5.3-.72-7.93-.83-6.34-.89-6.42-6.87-4.8A10.37,10.37,0,0,1,57.91,94c-6.87-2.7-9.65-8.06-7.4-16.2,1.12-4.08.12-5.2-3.72-4.8s-7.53-1-11.28-1.56c-2.6-.4-3-1.9-1.22-3.76,4.6-4.73,9.11-9.57,14-14C50.49,51.73,53.71,53,56.47,52.86Z"/><path class="cls-3" d="M33.91,112.07c-2.28-.68-2.28-2.49-.91-4.07,3-3.5,6.32-6.82,9.63-10.08,1.25-1.24,3.07-1.77,4.42-.24s.55,3-.81,4.33c-3.14,3-6.23,6-9.35,8.93A3.58,3.58,0,0,1,33.91,112.07Z"/><path class="cls-4" d="M57.78,104.55c-1.82,2.73-3.66,6-7.38,7.18-1.64.54-2.4-.59-2.32-2.25s5.47-7.44,7.32-7.61C57,101.73,58,102.38,57.78,104.55Z"/><path class="cls-5" d="M42.35,88.53c-.1,2-5.73,7.94-7.35,7.93-2.37,0-2.22-2-1.78-3.21,1.09-3,3.6-5.09,6.26-6.62C41,85.78,42.32,86.84,42.35,88.53Z"/><path class="cls-6" d="M82.1,69a7.12,7.12,0,0,1-7-6.43c-.14-3.31,3.14-6.9,6.56-6.71,3.67.2,6.34,2,6.56,6.06C88.42,65.86,85.78,68.88,82.1,69Z"/></g></g></svg>
                                    <fast-anchor href="https://developer.huawei.com/consumer/en/hms/huawei-pushkit" appearance="hypertext" target="_new">Learn more</fast-anchor>
                                  </div>
                                </div>
                              </fast-card>
                            </div>

                            <fast-card style="width: 100%; margin-top: 20px; background-color: #444;">
                              <div style="padding: 0 10px 10px; color: white;">
                                <h3>What is <b>HMS</b>?</h3>
                                <b>HMS (Huawei Mobile Services)</b> offers a rich array of open device and cloud capabilities, which facilitate efficient development, fast growth, and flexible monetization. This enables global developers to pursue groundbreaking innovation, deliver next-level user experiences, and make premium content and services broadly accessible. <fast-anchor href="https://developer.huawei.com/consumer/en/hms" appearance="hypertext" target="_new"><b>Click here</b></fast-anchor> to more about HMS capabilities.

                                <h3>How do I get the HMS Ads Kit IDs?</h3>
                                You need to create the HMS Ads Kit IDs through HUAWEI Ads Publisher Service, please <fast-anchor href="https://developer.huawei.com/consumer/en/doc/distribution/monetize/advantage-0000001051201913" appearance="hypertext" target="_new"><b>follow the instructions here</b></fast-anchor> to generate it.<br>
                              </div>
                            </fast-card>
                          </div>

                          ${this.show_ads_kit ? html`
                            <div class="form-group">
                              <label for="hmsAdsSplashId" class="hwLabel">
                                HMS Ads - Splash ID
                              </label>

                              <fast-text-field type="text" class="form-control" id="hmsAdsSplashId" name="hmsAdsSplashId" placeholder="Enter HMS Ads ID" value="${this.default_options ? this.default_options.hmsAdsSplashId : ""}" />
                            </div>

                            <div class="form-group">
                              <label for="hmsAdsTopBannerId" class="hwLabel">
                                HMS Ads - Top Banner ID
                              </label>

                              <fast-text-field type="text" class="form-control" id="hmsAdsTopBannerId" name="hmsAdsTopBannerId" placeholder="Enter HMS Ads ID" value="${this.default_options ? this.default_options.hmsAdsTopBannerId : ""}" />
                            </div>

                            <div class="form-group">
                              <label for="hmsAdsBottomBannerId" class="hwLabel">
                                HMS Ads - Bottom Banner ID
                              </label>
                              <fast-text-field type="text" class="form-control" id="hmsAdsBottomBannerId" name="hmsAdsBottomBannerId" placeholder="Enter HMS Ads ID" value="${this.default_options ? this.default_options.hmsAdsBottomBannerId : ""}" />
                            </div>
                          ` : html``}

                          ${this.show_agc ? html`
                            <div class="form-group">
                              <label for="agcJson" class="hwLabel">
                                AGConnect-Services JSON
                              </label>
                              <h3 class="hwLabel">Select agconnect-services.json from your local directory</h3>
                              <input type="file" id="agcsJson" name="agcsJson" accept="application/json" @change="${this.onAGCSFileChange}" class="hwLabel" />
                              <input type="hidden" name="agcs" id="agcs" />
                              <input type="hidden" name="aGConnectServicesJSON" id="aGConnectServicesJSON" />

                              <fast-card style="width: 100%; margin-top: 20px; background-color: #444;">
                                <div style="padding: 0 10px 10px; color: white;">
                                  <h3>What is <b>agconnect-services.json</b>?</h3>
                                  <b>Agconnect-services.json</b> is a JSON document created by Huawei AppGallery Connect to allow your app to connect to their HMS and AppGallery Connect (AGC) backend API. You need to provide this file to enable HMS kit &amp; AGC capability. <fast-anchor href="https://developer.huawei.com/consumer/en/hms" appearance="hypertext" target="_new"><b>Click here</b></fast-anchor> for step-by-step instructions to create agconnect-services.json for your AppGallery app.
                                </div>
                              </fast-card>
                            </div>
                          ` : html``}

                          <div class="form-group">
                            <label for="allowlist" class="hwLabel">
                              Allowlist

                              ${tooltip(
                                'whitelist',
                                "List the URLs that are allowed for in-app redirection, separated by commas."
                              )}
                            </label>
                            <fast-text-field type="text" class="form-control" id="allowlist" name="allowlist" placeholder="" value="${this.default_options ? this.default_options.allowlist : ""}" />
                            </fast-text-field>
                          </div>

                        </td>
                      </tr>
                    </table>

                  </fast-tab-panel>
                  <fast-tab-panel id="agPublish" class="tabs">
                    <table width="100%">
                      <tr>
                        <td width="47%">
                          <div class="form-group">
                            <label for="clientId" class="hwLabel">
                              Client ID
                            </label>
                            <fast-text-field type="text" class="form-control" id="clientIdInput" name="clientId" placeholder="" value="${this.clientId}" @change="${(e) => this.setInput("clientId", e.target.value)}" />
                            </fast-text-field>
                          </div>
                        </td>
                        <td width="6%"></td>
                        <td width="47%">
                          <div class="form-group">
                            <label for="appId" class="hwLabel">
                              App ID
                            </label>
                            <fast-text-field type="text" class="form-control" id="appIdInput" name="appId" placeholder="" value="${this.appId}" @change="${e => this.setInput("appId", e.target.value)}" width="10%" />
                            </fast-text-field>
                          </div>
                        <td/>
                      </tr>
                      <tr>
                        <td width="47%">
                          <div class="form-group">
                            <label for="clientKey" class="hwLabel">
                              Client Key
                            </label>
                            <fast-text-field type="text" class="form-control" id="clientKeyInput" name="clientKey" placeholder="" value="${this.clientKey}" @change="${e => this.setInput("clientKey", e.target.value)}" />
                            </fast-text-field>
                          </div>
                        </td>
                        <td width="6%"></td>
                        <td width="47%">
                          <div class="form-group">
                            <label for="agApk" class="hwLabel">
                              Upload APK
                            </label>
                            <input type="file" id="agApk" name="agApk" accept=".apk" @change="${this.getAGAPK}" class="hwLabel" />
                            <input type="hidden" name="apk" id="apk" />
                          </div>
                        <td/>
                      </tr>
                      <tr>
                        <td colspan="3">
                          <div class="publishButton" @click="${this.publishAppGalleryAPK}">
                            Publish APK to AppGallery
                          </div>
                          <fast-card style="width: 100%; margin-top: 20px; background-color: #444;">
                            <div style="padding: 0 10px 10px; color: white;">
                              <h3>What is the purpose of this Publish interface? (optional)</h3>
                              The Publish interface provides you a quick and easy option to upload and publish your PWA APK to your AppGallery developer account. To use this tool, please make sure that you have <fast-anchor href="https://developer.huawei.com/consumer/en/doc/agc-create_app" appearance="hypertext" target="_new"><b>created your app</b></fast-anchor> to get your <b>App ID</b>, <fast-anchor href="https://developer.huawei.com/consumer/en/doc/development/AppGallery-connect-Guides/agcapi-getstarted" appearance="hypertext" target="_new"><b>configure your AppGallery Connect API</b></fast-anchor> to get your <b>Client ID</b> &amp; <b>Client Key</b>. You do not need to use this interface to publish to your AppGallery account.</br>
                              More information:
                              <fast-anchor href="https://developer.huawei.com/consumer/en/doc/start/registration-and-verification-0000001053628148" appearance="hypertext" target="_new">
                                <b>Get started as a Huawei Developer</b>
                              </fast-anchor> |
                              <fast-anchor href="https://developer.huawei.com/consumer/en/doc/distribution/app/agc-release_app" appearance="hypertext" target="_new">
                                <b>Publish your app in AppGallery.</b>
                              </fast-anchor>
                            </div>
                          </fast-card>
                        </td>
                      </tr>
                    </table>
                  </fast-tab-panel>
                </fast-tabs>
              </fast-design-system-provider>

            </fast-accordion-item>
          </fast-accordion>
        </div>

        <div id="form-details-block">
          <p>${localeStrings.text.android.description.form_details}</p>
        </div>

        <div id="form-options-actions" class="modal-actions">
          <loading-button .loading="${this.generating}">
            <input id="generate-submit" type="submit" value="Generate" />
          </loading-button>
        </div>
      </form>
    `;
  }
}
