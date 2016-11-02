/* Framework */
import {ViewChild, Component} from '@angular/core';
import {Platform, MenuController, Nav} from 'ionic-angular';
import {DomSanitizer} from '@angular/platform-browser';

/* Pages */
// import {ListPage} from '../pages/list/list';
import {PostList} from '../pages/post-list/post-list';
import {Iframe} from '../pages/iframe/iframe';
import {TabsPage} from '../pages/tabs/tabs';
// import {MapPage} from '../pages/google-map/google-map';
import {CustomPage} from '../pages/custom-pages/custom-page';

/* Providers (make sure to add to ionicBootstrap below) */
// import {MenuProvider} from '../providers/menu/menu';
import {AppCamera} from '../providers/camera/app-camera';
// import {Posts} from '../providers/posts/posts';
import {GlobalVars} from '../providers/globalvars/globalvars';
import {AppAds} from '../providers/appads/appads';
import {FbConnect} from '../providers/facebook/facebook';
import {PushService} from '../providers/push/push';
import {AppWoo} from '../providers/appwoo/appwoo';
import {AppData} from '../providers/appdata/appdata';

/* Native */
import {StatusBar, SocialSharing, Device, InAppBrowser, Splashscreen, Push, Dialogs} from 'ionic-native';

@Component({
  templateUrl: 'app.html'
})

export class MyApp {
  @ViewChild(Nav) nav: Nav;

  pages: any;
  styles: any;
  apiurl: string;
  apppSettings: any;
  login: boolean;
  navparams: any = [];
  tabs: any;
  loggedin: boolean = false;
  loggedin_msg: string;
  showmenu: boolean = false;

  constructor(
    private platform: Platform,
    public appCamera: AppCamera,
    private menu: MenuController,
    private globalvars: GlobalVars,
    private appads: AppAds,
    private fbconnect: FbConnect,
    private sanitizer: DomSanitizer,
    private pushService: PushService,
    private appwoo: AppWoo,
    private appdata: AppData
  ) {

    this.apiurl = globalvars.getApi();

    this.initializeApp();

    // get our app data, then use it. will return either local data, or get from api
    this.appdata.load(this.apiurl).then( (data) => {

      console.log('Got data', data);

      this.loadMenu(data);
      this.loadStyles(data);

    }).catch( e => {

      // if there's a problem, default to app-data.json
      console.log( 'problem getting appdata, getting local json file', e );

      this.appdata.getData( 'app-data.json' ).then( data => {
        console.log('Got local data file.');

        this.loadMenu(data);
        this.loadStyles(data);

      });

    });

  }

  loadMenu(data) {
    // any menu imported from WP has to use same component. Other pages can be added manually with different components

    // If we have a tab menu, set that up
    if( data.tab_menu.items ) {

      // let e = { 'title': "Custom Page", 'type': 'apppages', 'class': "information-circle", slug: 'custom' };

      // data.tab_menu.items.push( e );

      for( let item of data.tab_menu.items ) {

        // set component, default is Iframe
        var root:Object = Iframe;

        if( item.type === 'apppages' && item.page_type === 'list' ) {
          root = PostList;
        } else if( item.type === 'apppages' ) {
          root = CustomPage;
        }

        console.debug('tab_menu slug: ' + item.slug);

        this.navparams.push( { 'title': item.title, 'url': item.url, 'root': root, 'icon': item.class, 'slug': item.slug } );
      }

      this.tabs = this.navparams;

      this.nav.setRoot(TabsPage, this.tabs);

    }

    if( data.menus.items ) {

      this.pages = data.menus.items;

      this.showmenu = true;

      // Add pages manually here, can use different components like this...
      // let d = { 'title': 'Map', 'url': '', 'component': MapPage };
      // let e = { 'title': "Custom Page", 'component': CustomPage, 'class': "information-circle", 'navparams': { slug: 'custom' } };

      // this.pages.push( d );

      // set the home page to the proper component
      if( this.tabs ) {
        this.pages.unshift( { 'title': data.tab_menu.name, 'url': '', 'component': TabsPage, 'navparams': this.navparams, 'class': 'home' } );
      } else if( !this.tabs && data.menus.items[0].type === 'apppages' ) {
        
        // if it's a list page, use PostList component
        if( data.menus.items[0].page_type === 'list' )
          this.nav.setRoot( PostList, data.menus.items[0] );

        console.debug('CustomPage data: ' + data.menus.items[0] );

        // otherwise use CustomPage
        this.nav.setRoot( CustomPage, data.menus.items[0] );

      } else {

        // anything else uses Iframe component
        this.nav.setRoot( Iframe, data.menus.items[0] );

      }

    }

  }

  openPage(page) {

    // this.menuProvider.openPage( page );

    console.log( page.type + page.page_type);

    // close the menu when clicking a link from the menu
    this.menu.close();

    if( page.type === 'apppages' && page.page_type === 'list' ) {
      this.nav.setRoot( PostList, page );
    } else if( page.type === 'apppages' ) {
      this.nav.setRoot( CustomPage, page );
    } else if (page.url) {
      this.nav.setRoot(Iframe, page);
    } else {
      this.nav.setRoot(page.component, page.navparams);
    }

    // when dynamic components are enabled, delete above code and use this instead
    // this.nav.setRoot(page.component, page.navparams );
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();

      Splashscreen.hide();

      this.loggedin_msg = window.localStorage.getItem( 'logged_in_msg' );

      this.attachListeners();

      if( Device.device.platform === 'iOS' || Device.device.platform === 'Android' )
        this.maybeDoPush();

      setTimeout( () => {
        // run this in the background, then we can update the data on next app load if needed
        this.appdata.checkForUpdates( this.apiurl );
      }, 5000 );
      

    });

  }

  loadStyles( data ) {

    // console.log( data );

    // kinda hacky, but it works
    let styles = "<style>";

    // toolbar color
    styles += ".toolbar-background-md, .toolbar-background-ios, .tabs-md .tabbar, .tabs-ios .tabbar { background: " + data.meta.design.toolbar_background + " }";

    // toolbar text
    styles += ".toolbar-content, .toolbar-title, .bar-button-default, .toolbar .bar-button-default:hover, .toolbar .segment-button, .toolbar button.activated, .tabs-md .tab-button[aria-selected=true], .tabs-ios .tab-button[aria-selected=true], ion-toolbar .button { color: "  + data.meta.design.toolbar_color + " }";

    // left menu colors
    styles += ".menu-inner .content-md, .menu-inner .content-ios, .menu-inner ion-list .item { color: "  + data.meta.design.left_menu_text + "; background-color: "  + data.meta.design.left_menu_bg + " }";

    // left menu icon color
    styles += "ion-menu .list-md ion-icon, ion-menu .list-ios ion-icon { color: "  + data.meta.design.left_menu_icons + " }";

    // body text and background
    styles += "ion-page ion-content, ion-page ion-list .item { color: "  + data.meta.design.text_color + "; background-color: "  + data.meta.design.body_bg + " }";
    styles += "p, .item p { color: "  + data.meta.design.text_color + " }";

    // buttons
    styles += ".button-primary { background: " + data.meta.design.button_background + "!important; color: "  + data.meta.design.button_text_color + " }";

    // headings
    styles += "ion-page h1, ion-page h2, ion-page h3, ion-page h4, ion-page h5, ion-page h6, ion-page ion-list .item h2, ion-page ion-list .item h3, ion-page ion-list .item h4 { color: "  + data.meta.design.headings_color + " }";

    // links
    styles += "ion-page ion-content a, ion-page ion-content a:visited { color: "  + data.meta.design.link_color + " }";

    styles += data.meta.design.custom_css;

    // hide menu toggle if no left menu
    if( this.showmenu === false ) {
      styles += 'ion-navbar .bar-button-menutoggle { display: none !important; }';
    }

    styles += "</style>";

    this.styles = this.sanitizer.bypassSecurityTrustHtml( styles );
    
  }

  /* 
  * We are listening for postMessage events from the iframe pages. When something needs to happen, a message is sent from the iframe as a JSON object, such as { iablink: 'http://apppresser.com', target: '_blank', options: '' }. We parse that object here, and do the phonegap stuff like window.open(data.iablink)
  */

  attachListeners() {

    // When WP site loads, attach our click events
    window.addEventListener('message', (e) => {

      console.log('postMessage', e.data);

      // if it's not our json object, return
      if (e.data.indexOf('{') != 0)
        return;

      var data = JSON.parse(e.data);

      if (data.url) {

        // push a new page
        let page = { title: data.title, component: Iframe, url: data.url, classes: null };
        this.nav.push(Iframe, page);

      } else if (data.msg) {

        // social sharing was clicked, show that
        SocialSharing.share(data.msg, null, null, data.link);

      } else if (data.iablink) {

        // in app browser links
        this.openIab(data.iablink, data.target, data.options);

      } else if (data.camera && data.camera === 'library' ) {

        if(data.appbuddy === true ) {
          this.appCamera.photoLibrary(true);
        } else {
          this.appCamera.photoLibrary(false);
        }

      } else if (data.camera && data.camera === 'photo') {
        
        if (data.appbuddy === true) {
          this.appCamera.openSheet(true);
        } else {
          this.appCamera.takePicture(false);
        }

      } else if ( data.fblogin ) {

        this.fbconnect.login();

      } else if ( data.paypal_url ) {

        this.appwoo.paypal( data.paypal_url, data.redirect );

      } else if( data.loggedin ) {

        console.log('loggedin msg', data);

        this.loggedin = ( data.loggedin === "1" ) ? true : false;

        console.log( 'loggedin? ' + this.loggedin );

        if( data.message ) {
          let res = data.message.split(",");
          window.localStorage.setItem( 'logged_in_msg', res[0] );
          this.loggedin_msg = res[0];
        }

      }

    }, false); // end eventListener

  }

  openIab( link, target, options = null ) {
    window.open(link, target, options );
  }

  maybeDoAds() {

    if(!Device.device.platform ) return;

    let ad_units: { ios: any, android: any } = null;
    ad_units.ios  = { banner: this.apppSettings.admob_ios_banner,
      interstitial: this.apppSettings.admob_ios_interstitial };
    ad_units.android = { banner: this.apppSettings.admob_android_banner,
      interstitial: this.apppSettings.admob_android_interstitial };

    // If we don't have any ads set, stop
    if( ad_units.ios.banner + ad_units.ios.interstitial + ad_units.android.banner + ad_units.android.interstitial === '' ) {
      console.log('no ads, bail');
      return;
    }

    this.appads.setOptions( this.apppSettings );

    // If we have a banner id, show on the proper platform
    if( Device.device.platform === 'iOS' && ad_units.ios.banner != '' ) {
      this.appads.createBanner( ad_units.ios.banner );
    } else if( Device.device.platform === 'Android' && ad_units.android.banner != '' ) {
      this.appads.createBanner( ad_units.android.banner );
    }

    // show interstitial like this
    // this.appads.interstitial( ad_units.ios.interstitial );

  }

  maybeDoPush() {

    // TODO: check for something here, like if(!navigator.push) return;

    let push = Push.init({
      android: {
          senderID: "[[gcm_sender]]"
      },
      ios: {
          alert: "true",
          badge: true,
          clearBadge: true,
          sound: 'false'
      },
      windows: {}
    });

    push.on('registration', (data) => {

      // kick off aws stuff
      this.pushService.subscribeDevice(data.registrationId).then( result => {
        console.log(result);
      });

    });

    push.on('notification', (data) => {

      if( data.additionalData && (<any>data).additionalData.page ) {
        // TODO: check if external link. If so, use IAB
        this.openPage( (<any>data).additionalData.page );
        return;
      }

      Dialogs.alert(
        data.message,  // message
        data.title,            // title
        'Done'                // buttonName
      );

    });

    push.on('error', (e) => {
      console.log(e.message);
    });

  }

}