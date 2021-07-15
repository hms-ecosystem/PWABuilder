import {
  validateAndroidOptions,
  AndroidApkOptions,
  generatePackageId,
} from '../../utils/android-validation';
import { env } from '../../utils/environment';
import { findSuitableIcon, findBestAppIcon } from '../../utils/icons';
import { Manifest } from '../../utils/interfaces';
import { getURL } from '../app-info';
import { getManifestGuarded, getManiURL } from '../manifest';

export let huawei_generated = false;

export async function generateHuaweiPackage(
  androidOptions: AndroidApkOptions,
  form?: HTMLFormElement
): Promise<Blob | undefined> {
  const validationErrors = validateAndroidOptions(androidOptions);
  if (validationErrors.length > 0 || !androidOptions) {
    throw new Error(
      'Invalid Adroid options. ' + validationErrors.map(a => a.error).join('\n')
    );
  }

  const generateAppUrl = `${env.huaweiPackageGeneratorUrl}/build_apk`;

  try {
    const response = await fetch(generateAppUrl, {
      method: 'POST',
      body: JSON.stringify(androidOptions),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    if (response.status === 200) {
      //set generated flag
      huawei_generated = true;

      return await response.blob();
    } else {
      const responseText = await response.text();

      // Did it fail because images couldn't be fetched with ECONNREFUSED? E.g. https://github.com/pwa-builder/PWABuilder/issues/1312
      // If so, retry using our downloader proxy service.
      const hasSafeImages =
        androidOptions.iconUrl &&
        androidOptions.iconUrl.includes(env.safeUrlFetcher || '');
      const isConnectionRefusedOrForbidden =
        (responseText || '').includes('ECONNREFUSED') ||
        response.status === 403;

      if (!hasSafeImages && isConnectionRefusedOrForbidden) {
        console.warn(
          'Android package generation failed with ECONNREFUSED. Retrying with safe images.',
          responseText
        );
        const updatedOptions = updateAndroidOptionsWithSafeUrls(androidOptions);

        await generateHuaweiPackage(updatedOptions, form);
      } else {
        throw new Error(
          `Error generating Android package.\n\nStatus code: ${response.status}\n\nError: ${response.statusText}\n\nDetails: ${responseText}`
        );
      }
    }
  } catch (err) {
    const responseError = err as Response; // is this the right type? Is there a ResponseError type? 
    const statusCode = responseError.status || 'unknown';
    const statusText = responseError.statusText || 'unknown';
    throw new Error(
      `Error generating Android platform due to HTTP error.\n\nStatus code: ${statusCode}\n\nError: ${statusText}\n\nDetails: ${err}`
    );
  }

  return undefined;
}

export async function publishAGAPK(payload: any){
  const publishAppGalleryApkUrl = `${env.huaweiPackageGeneratorUrl}/publish_apk`;
  console.log(payload)
  try {
    const response = await fetch(publishAppGalleryApkUrl, {
      method: "POST",
      headers: new Headers({'content-type': 'application/json'}),
      body: JSON.stringify(payload)
    });

    if (response.status === 200) {
      huawei_generated = true;
      console.log('AppGallery APK successfully published!');
      return await response.blob();
    } else {
      const responseText = await response.text();
      console.log(responseText);
    }
  } catch (err) {
    throw new Error(
      `Error publishing AppGallery APK due to HTTP error.\n\nStatus code: ${err.status}\n\nError: ${err.statusText}\n\nDetails: ${err}`
    );
  }
}

export async function createHuaweiPackageOptionsFromForm(
  form: HTMLFormElement,
  signingFile?: string
): Promise<AndroidApkOptions> {
  console.log('createHuaweiPackageOptionsFromForm '+ form);
  const manifest = await getManifestGuarded();
  if (!manifest) {
    throw new Error('Could not find the web manifest');
  }

  const maniUrl = getManiURL();
  const pwaUrl = getURL();

  if (!pwaUrl) {
    throw new Error("Can't find the current URL");
  }

  if (!maniUrl) {
    throw new Error('Cant find the manifest URL');
  }

  const appName =
    form.appName.value || manifest.short_name || manifest.name || 'My PWA';
  const packageName = generatePackageId(
    form.packageId.value || new URL(pwaUrl).hostname
  );
  // Use standalone display mode unless the manifest has fullscreen specified.
  const display =
    manifest.display === 'fullscreen' ? 'fullscreen' : 'standalone';
  const navColorOrFallback =
    manifest.theme_color || manifest.background_color || '#000000';
  const manifestUrlOrRoot = maniUrl.startsWith("data:application/manifest+json,") ? pwaUrl : maniUrl;

  const hmsKitsFill = (hmsAnalyticsKit: string, hmsPushKit: string, hmsAdsKit: string) => {
    let arr = [];
    if(hmsAnalyticsKit){
      arr.push("analytics");
    }
    if(hmsPushKit){
      arr.push("push");
    }
    if(hmsAdsKit){
      arr.push("ads");
    }
    return arr;
  }

  const adIdsFill = () => {
    let arr = [];
    if(!form.hmsAdsSplashId){
      arr.push({ splash: '' });
    } else {
      if(!form.hmsAdsSplashId.value){
        arr.push({ splash: '' });
      } else {
        if(form.hmsAdsSplashId.value.length > 0) {
          arr.push({ splash: form.hmsAdsSplashId.value });
        }
      }
    }
    if(!form.hmsAdsTopBannerId){
      arr.push({ topBanner: '' });
    } else {
      if(!form.hmsAdsTopBannerId.value){
        arr.push({ topBanner: '' });
      } else {
        if(form.hmsAdsTopBannerId.value.length > 0) {
          arr.push({ topBanner: form.hmsAdsTopBannerId.value });
        }
      }
    }
    if(!form.hmsAdsBottomBannerId){
      arr.push({ bottomBanner: '' });
    } else {
      if(!form.hmsAdsBottomBannerId.value){
        arr.push({ bottomBanner: '' });
      } else {
        if(form.hmsAdsBottomBannerId.value.length > 0) {
          arr.push({ bottomBanner: form.hmsAdsBottomBannerId.value });
        }        
      }
    }
    return arr;
  }

  const checkAGCS = () => {
    if(!form.agcs){
      return '';
    } else {
      if(!form.agcs.value){
        return '';
      } else {
        return form.agcs.value;
      }
    }
  }

  const checkAGCSJson = () => {
    if(!form.aGConnectServicesJSON){
      return '';
    } else {
      if(!form.aGConnectServicesJSON.value){
        return '';
      } else {
        return form.aGConnectServicesJSON.value;
      }
    }
  }

  return {
    appVersion: form.appVersion.value || '1.0.0.0',
    appVersionCode: form.appVersionCode.value || 1,
    backgroundColor:
      form.backgroundColor.value ||
      manifest.background_color ||
      manifest.theme_color ||
      '#FFFFFF',
    display: form.displayMode.value || display,
    enableNotifications: form.enableNotifications.checked,
    enableSiteSettingsShortcut: form.enableSiteSettingsShortcut.checked,
    fallbackType: form.fallbackType.value || 'customtabs',
    features: {
      locationDelegation: {
        enabled: form.locationDelegation.checked,
      },
      // playBilling: {
      //   enabled: form.playBilling.checked,
      // },
    },
    host: form.host.value || pwaUrl,
    iconUrl: getAbsoluteUrl(form.iconUrl.value, manifestUrlOrRoot),
    includeSourceCode: form.includeSourceCode.checked,
    isChromeOSOnly: form.isChromeOSOnly.checked,
    launcherName: form.launcherName.value || manifest.short_name || appName, // launcher name should be the short name. If none is available, fallback to the full app name.
    maskableIconUrl: getAbsoluteUrl(form.maskableIconUrl.value, manifestUrlOrRoot),
    monochromeIconUrl: getAbsoluteUrl(form.monochromeIconUrl.value, manifestUrlOrRoot),
    name: form.appName.value || manifest.name || 'My Awesome PWA',
    navigationColor: form.navigationColor.value || navColorOrFallback,
    navigationColorDark: form.navigationColorDark.value || navColorOrFallback,
    navigationDividerColor:
      form.navigationDividerColor.value || navColorOrFallback,
    navigationDividerColorDark:
      form.navigationDividerColorDark.value || navColorOrFallback,
    orientation: manifest.orientation || 'default',
    packageId: form.packageId.value || packageName,
    shortcuts: manifest.shortcuts || [],
    signing: {
      file: signingFile ? signingFile : null,
      alias: form.alias ? form.alias.value : 'my-key-alias',
      fullName: form.fullName
        ? form.fullName.value
        : `${manifest.short_name || manifest.name || 'App'} Admin`,
      organization: form.organization
        ? form.organization.value
        : manifest.name || 'PWABuilder',
      organizationalUnit: form.organizationalUnit
        ? form.organizationalUnit.value
        : 'Engineering',
      countryCode: form.countryCode ? form.countryCode.value : 'US',
      keyPassword: form.keyPassword ? form.keyPassword.value : '', // If empty, one will be generated by CloudAPK service
      storePassword: form.keyPassword ? form.storePassword.value : '',
    },
    signingMode: form.signingMode ? form.signingMode.value : 'new',
    splashScreenFadeOutDuration: form.splashScreenFadeOutDuration.value || 300,
    startUrl: getStartUrlRelativeToHost(
      form.startUrl.value || manifest.start_url || "/",
      manifestUrlOrRoot
    ),
    themeColor: form.themeColor.value || manifest.theme_color || '#FFFFFF',
    shareTarget: manifest.share_target,
    webManifestUrl: form.webManifestUrl.value || maniUrl,
    HMSKits: hmsKitsFill(form.hmsAnalyticsKit.value === "on" ? true : false, form.hmsPushKit.value === "on" ? true : false, form.hmsAdsKit.value === "on" ? true : false),
    agcs: checkAGCS(),
    aGConnectServicesJSON: checkAGCSJson(),
    ads_id: adIdsFill(),
    whitelist: form.allowlist.value,
  };
}

export async function createHuaweiPackageOptionsFromManifest(
  localManifest?: Manifest
): Promise<AndroidApkOptions> {
  let manifest: Manifest | undefined;

  if (localManifest) {
    manifest = localManifest;
  } else {
    manifest = await getManifestGuarded();
  }

  if (!manifest) {
    throw new Error('Could not find the web manifest');
  }

  const maniUrl = getManiURL();
  const pwaUrl = getURL();

  if (!pwaUrl) {
    throw new Error("Can't find the current URL");
  }

  if (!maniUrl) {
    throw new Error('Cant find the manifest URL');
  }

  const appName = manifest.short_name || manifest.name || 'My PWA';
  const packageName = generatePackageId(new URL(pwaUrl).hostname);
  // Use standalone display mode unless the manifest has fullscreen specified.
  const display =
    manifest.display === 'fullscreen' ? 'fullscreen' : 'standalone';

  const manifestIcons = manifest.icons || [];
  const icon = findBestAppIcon(manifestIcons);
  if (!icon) {
    throw new Error(
      "Can't find a suitable icon to use for the Android package. Ensure your manifest has a square, large (512x512 or better) PNG icon."
    );
  }

  const maskableIcon =
    findSuitableIcon(manifestIcons, 'maskable', 512, 512, 'image/png') ||
    findSuitableIcon(manifestIcons, 'maskable', 192, 192, 'image/png') ||
    findSuitableIcon(manifestIcons, 'maskable', 192, 192, undefined);
  const monochromeIcon =
    findSuitableIcon(manifestIcons, 'monochrome', 512, 512, 'image/png') ||
    findSuitableIcon(manifestIcons, 'monochrome', 192, 192, 'image/png') ||
    findSuitableIcon(manifestIcons, 'monochrome', 192, 192, undefined);
  const navColorOrFallback =
    manifest.theme_color || manifest.background_color || '#000000';

  // Support URL-encoded manifests. See https://github.com/pwa-builder/PWABuilder/issues/1926
  // When URL-encoded manifest is the manifest URL, we can resolve relative paths using the PWA URL itself.
  // For example, consider this manifest declaration:
  //    <link rel="manifest" href="data:application/manifest+json,..." />
  // The manifestUrl will be "data:application/manifest+json,..."
  // In this case, we can't do new URL("/foo.png", "data:application/manifest+json") - it will throw an error.
  // Instead, we can resolve the absolute URL using the PWA URL itself.
  const manifestUrlOrRoot = maniUrl.startsWith("data:application/manifest+json,") ? pwaUrl : maniUrl;

  return {
    appVersion: '1.0.0.0',
    appVersionCode: 1,
    backgroundColor:
      (manifest.background_color as string) ||
      (manifest.theme_color as string) ||
      '#FFFFFF',
    display: display,
    enableNotifications: true,
    enableSiteSettingsShortcut: true,
    fallbackType: 'customtabs',
    features: {
      locationDelegation: {
        enabled: true,
      },
      playBilling: {
        enabled: false,
      },
    },
    host: pwaUrl,
    iconUrl: getAbsoluteUrl(icon.src, manifestUrlOrRoot),
    includeSourceCode: false,
    isChromeOSOnly: false,
    launcherName: (manifest.short_name as string) || (appName as string), // launcher name should be the short name. If none is available, fallback to the full app name.
    maskableIconUrl: getAbsoluteUrl(maskableIcon?.src, manifestUrlOrRoot),
    monochromeIconUrl: getAbsoluteUrl(monochromeIcon?.src, manifestUrlOrRoot),
    name: appName as string,
    navigationColor: navColorOrFallback as string,
    navigationColorDark: navColorOrFallback as string,
    navigationDividerColor: navColorOrFallback as string,
    navigationDividerColorDark: navColorOrFallback as string,
    orientation: manifest.orientation || 'default',
    packageId: packageName,
    shortcuts: manifest.shortcuts || [],
    signing: {
      file: null,
      alias: 'my-key-alias',
      fullName: `${manifest.short_name || manifest.name || 'App'} Admin`,
      organization: manifest.name || 'PWABuilder',
      organizationalUnit: 'Engineering',
      countryCode: 'US',
      keyPassword: '', // If empty, one will be generated by CloudAPK service
      storePassword: '', // If empty, one will be generated by CloudAPK service
    },
    signingMode: 'new',
    splashScreenFadeOutDuration: 300,
    startUrl: getStartUrlRelativeToHost(manifest.start_url, new URL(manifestUrlOrRoot)),
    themeColor: (manifest.theme_color as string) || '#FFFFFF',
    shareTarget: manifest.share_target,
    webManifestUrl: maniUrl,
    HMSKits: [],
    agcs: {},
    aGConnectServicesJSON: {},
    ads_id: [],
    whitelist: '',
  };
}

/**
 * Resolves a relative URL to an absolute URL based on the manifest URL.
 * If relativeUrl is null, this will return an empty string.
 * @param relativeUrl The relative URL to make absolute.
 * @param manifestUrl The absolute URL to the web manifest.
 */
function getAbsoluteUrl(
  relativeUrl: string | undefined,
  manifestUrl: string
): string {
  if (!relativeUrl) {
    return '';
  }

  return new URL(relativeUrl, manifestUrl).toString();
}

function getStartUrlRelativeToHost(
  startUrl: string | null | undefined,
  manifestUrl: URL | string
) {
  // Example with expected output:
  // - IN: startUrl = "./index.html?foo=1"
  // - IN: manifestUrl = "https://www.foo.com/subpath/manifest.json"
  // - OUT: "/subpath/index.html?foo=1"

  // The start URL we send to the CloudAPK service should be a URL relative to the host.
  const absoluteStartUrl = new URL(startUrl || '/', manifestUrl);
  return absoluteStartUrl.pathname + (absoluteStartUrl.search || '');

  // COMMENTED OUT: Old PWABuilder v2 URL creation. Commented out because we can do the same thing in less code above.
  // if (
  //   !manifest.start_url ||
  //   manifest.start_url === '/' ||
  //   manifest.start_url === '.' ||
  //   manifest.start_url === './'
  // ) {
  //   // First, if we don't have a start_url in the manifest, or it's just "/",
  //   // then we can just use that.
  //   relativeStartUrl = '/';
  // } else {
  //   // The start_url in the manifest is either a relative or absolute path.
  //   // Ensure it's a path relative to the root.
  //   const absoluteStartUrl = new URL((manifest.start_url as string), maniURL);
  //   relativeStartUrl =
  //     absoluteStartUrl.pathname + (absoluteStartUrl.search || '');
  // }
}

function updateAndroidOptionsWithSafeUrls(
  options: AndroidApkOptions
): AndroidApkOptions {
  const absoluteUrlProps: Array<keyof AndroidApkOptions> = [
    'maskableIconUrl',
    'monochromeIconUrl',
    'iconUrl',
    'webManifestUrl',
  ];
  for (const prop of absoluteUrlProps) {
    const url = options[prop];
    if (url && typeof url === 'string') {
      const safeUrl = `${process.env.safeUrlFetcher}?url=${encodeURIComponent(
        url
      )}`;
      (options as any)[prop] = safeUrl;
    }
  }
  return options;
}
