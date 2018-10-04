import { NativeModulesProxy } from 'expo-core';
import firebase from 'firebase';

import Expo from './Expo';

if (!('analytics' in firebase) || !('logEvent' in firebase.analytics())) {
  firebase.analytics = function () {
    return {
      logEvent(event, params) {
        console.log('TODO: firebase.analytics().logEvent()', event, params);
      },
    };
  };
}

if (!('messaging' in firebase) || !('onMessage' in firebase.messaging())) {
  firebase.messaging = function () {
    return {
      onMessage(handler) {
        return Expo.Notifications.addListener(handler);
      },
      setBadgeNumber(num) {
        return NativeModulesProxy.ExponentNotifications.setBadgeNumberAsync(num);
      },
      async requestPermission() {
        const { status } = await Expo.Permissions.askAsync(Expo.Permissions.NOTIFICATIONS);
        return status === 'granted';
      },
    };
  };
}

export default firebase;