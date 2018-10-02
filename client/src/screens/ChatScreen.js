import { dispatch } from '@rematch/core';
import firebase from 'firebase';
import React from 'react';
import {
  Clipboard,
  InteractionManager,
  LayoutAnimation,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bubble, GiftedChat, MessageText } from 'react-native-gifted-chat';
import { connect } from 'react-redux';

import AccessoryBar from '../components/AccessoryBar';
import CustomActions from '../components/chat/Actions';
import EmptyChat from '../components/EmptyChat';
import GifScroller from '../components/GifScroller';
import Loading from '../components/Loading';
import Time from '../components/Time';
import Meta from '../constants/Meta';
import Fire from '../Fire';
import * as MessagesProvider from '../provider/MessagesProvider';
import CustomView from './CustomView';

class Chat extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: `${navigation.state.params.title}`,
    headerStyle: {
      opacity: 1,
    },
  });

  state = {
    // prefs: {},
    // keyboard: 0,
    // gifActive: false,
  };

  get user() {
    return {
      _id: this.uid, // sent messages should have same user._id
      name: this.props.name,
    };
  }

  get uid() {
    return Fire.shared.uid;
  }

  async componentDidMount() {
    const { groupId, otherUsers, otherUserUid } = this.props;
    await Fire.shared.getUserAsync({ uid: otherUserUid });
    dispatch.chats.startChatting({
      uids: otherUsers,
      callback: (unsubscribe) => {
        this.unsubscribe = unsubscribe;
        dispatch.isTyping.observe({ groupId, uid: otherUserUid }); // TODO: UNSUB
        // dispatch.users.getProfileImage({ uid: otherUserUid });
      },
    });
  }

  componentWillUnmount() {
    // const { channel } = this.state;
    this.isUserEditing = false;
    // const uid = this.uid;
    // console.log("sukapunch", `messages/${channel}/users/${uid}`);
    // this.ref(`messages/${channel}/users/${uid}`).orderByKey().limitToLast(pageSize).off('child_added', snapshot => this.didRecieveMessageKey(snapshot.key))
    // this.ref(`messages/${channel}/typing/${uid}`).off('value', this.didRecieveTyping)
  }

  onSendMessage = (messages = []) => {
    this.isUserEditing = false;
    for (const message of messages) {
      const chat = {
        from: this.uid,
        // from: `${Fire.user().uid}`,
        image: message.image || null,
        timestamp: Date.now(),
        message: message.text || null,
        location: message.location || null,
        seen: null,
        // server_recieved: -1
      };

      (async () => {
        // console.log("I just bought", chat, Fire.user().uid)
        const {
          message: _message,
          chatKey,
        } = await MessagesProvider.sendMessage(
          this.props.channel,
          this.props.targetUID,
          chat,
        );

        const _nMessage = {};
        for (const key in _message) {
          const meta = _message[key];
          if (meta) {
            _nMessage[key] = meta;
          }
        }
        dispatch.chats.didRecieveMessageKey({
          chatKey,
          groupId: this.props.channel,
          _nMessage,
        });
        // this.didRecieveMessageKey(chatKey, _nMessage);
      })();
    }
  };

  get isUserEditing() {
    return this._isUserEditing;
  }
  set isUserEditing(value) {
    if (this._isUserEditing === value) {
      return;
    }

    this._isUserEditing = value;
    if (value) {
      this.userStartedTyping();
    } else {
      this.userFinishedTyping();
    }
  }
  _isUserEditing = false;

  // async componentDidMount() {
  //   InteractionManager.runAfterInteractions(() => {
  //     (async () => {
  //       try {
  //         if (!this.props.targetName) {
  //           dispatch.users.getPropertyForUser({ uid: this.props.targetUID, property: 'first_name' });
  //         }
  //       } catch ({ message }) {
  //         console.error(message);
  //       }
  //     })();
  //   });

  //   dispatch.chats.getChannelForUser({ uid: this.props.targetUID, callback: this.loadMessages });
  // }

  ref = route => firebase.database().ref(route);

  componentWillUpdate() {
    LayoutAnimation.easeInEaseOut();
  }

  _keyboardDidShow = () => {
    // this.setState({ keyboard: 0 })
    // this.setState({gifOpen: false })
    InteractionManager.runAfterInteractions(() => {
      dispatch.chats.updatedGifOpened({
        channel: this.props.channel,
        isOpened: false,
      });
      this._GiftedMessenger.setBottomOffset(this._GiftedMessenger.getKeyboardHeight());
    });
  };

  _keyboardDidHide = () => {
    // this.setState({ keyboard: 0 })
    // this.setState({ keyboard: 0 });
  };

  // loadMessages = async ({ channel }) => {
  //   const { uid, first_name } = firebase.user();
  //   // const image = await ImageProvider.getProfileImage({uid: this.props.targetUID});
  //   dispatch.users.getProfileImage({ uid: this.props.targetUID });
  //   dispatch.chats.observeTyping({ channel, uid: this.props.targetUID });
  //   // dispatch.chats.subscribeToChannel(channel);
  //   dispatch.chats.observeTyping({ channel, uid: this.props.targetUID });
  // };

  deleteMessage = (key) => {
    dispatch.chats.deleteMessageFromChannel({
      groupId: this.props.groupId,
      key,
    });
    // this.ref(`messages/${this.state.channel}/users/${this.uid}/${key}`).remove();

    // /// Optimistic UI - Remove Message Right Away ... This Could Be Faster Tho...
    // let _messages = [];
    // for (let i = 0; i < this.state.messages.length; i++) {
    //   const message = this.state.messages[i];
    //   if (message._id !== key) {
    //     _messages.push(message);
    //   }
    // }
    // this.setState({ messages: _messages });
  };
  renderCustomActions = props => <CustomActions {...props} />;

  renderText = messageProps => (
    <MessageText
      {...messageProps}
      styles={{
        left: {},
        right: {
          color: 'red',
        },
      }}
    />
  );

  renderTime = messageProps => <Time {...messageProps} />;

  renderBackground = () => {
    if (this.props.firstMessage) return null;

    return (
      <View style={StyleSheet.absoluteFill}>
        <EmptyChat uid={this.props.targetUID} />{' '}
      </View>
    );
  };

  // renderActions={this.renderCustomActions}

  userStartedTyping = () =>
    dispatch.isTyping.setAsync({ isTyping: true, groupId: this.props.groupId });

  userFinishedTyping = () =>
    dispatch.isTyping.setAsync({
      isTyping: false,
      groupId: this.props.groupId,
    });

  renderCustomView = props => <CustomView {...props} />;

  renderFooter = () => {
    if (this.props.isTyping) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            {`${this.props.targetName} ${Meta.is_typing}`}
          </Text>
        </View>
      );
    }
    return null;
  };

  onUserProfilePicturePressed = () => {
    // Your logic here
    // Eg: Navigate to the user profile
  };

  renderBubble = (props) => {
    const { currentMessage } = props;

    let backgroundColor;
    if (currentMessage.imageUrl || currentMessage.location) {
      backgroundColor = 'transparent';
    }

    const _wrapperStyle = {
      right: {
        backgroundColor: backgroundColor || wrapperStyle.right.backgroundColor,
      },
      left: {
        backgroundColor: backgroundColor || wrapperStyle.left.backgroundColor,
      },
    };
    return <Bubble {...props} wrapperStyle={_wrapperStyle} />;
  };

  onLoadEarlier = () => dispatch.chats.loadEarlier(this.props.channel);

  onPressAvatar = user =>
    this.props.navigation.navigate('OtherProfile', { uid: user._id });

  renderAccessory = () => (
    <AccessoryBar
      channel={this.props.channel}
      text={this.props.userInput}
      gifActive={this.props.gifOpened}
      onSend={this.onSendMessage}
      onGif={this.onGif}
    />
  );

  onGif = () => {
    // this.setState({ gifActive: active });
    // dispatch.chats.updatedGifOpened({ channel: this.props.channel, isOpened: active });
    // Keyboard.dismiss();
  };

  renderChatFooter = () => {
    if (
      this.props.gifOpened &&
      this.props.userInput &&
      this.props.userInput.length > 0
    ) {
      return (
        <GifScroller
          style={{ width: '100%', height: 100, backgroundColor: 'white' }}
          inputText={this.props.userInput}
          handleGifSelect={this.handleGifSelect}
        />
      );
    }
    return null;
  };

  handleGifSelect = (url) => {
    this.onSendMessage([{ image: { uri: url, name: this.props.userInput } }]);
    firebase
      .analytics()
      .logEvent('sent_gif', { channel: this.props.channel, url });
  };

  onInputTextChanged = (text) => {
    let gifOpen = this.props.gifOpened;
    if (gifOpen && !text) {
      gifOpen = false;
    }
    dispatch.chats.updatedInputText({
      channel: this.props.channel,
      input: text,
    });
    dispatch.chats.updatedGifOpened({
      channel: this.props.channel,
      isOpened: gifOpen,
    });
    this.isUserEditing = text !== '';
  };

  onLongPress = (context, message) => {
    const {
      // from: _from,
      _id,
    } = message;

    // const canDelete = _from === this.uid;
    if (message.text) {
      const options = [];
      if (message.text) {
        options.push('Copy Text');
      }
      // if (canDelete) {
      options.push('Delete Message');
      // }
      options.push('Cancel');
      const cancelButtonIndex = options.length - 1;
      context.actionSheet().showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          switch (options[buttonIndex].toLowerCase()) {
            case 'copy text':
              Clipboard.setString(message.text);
              break;
            case 'delete message':
              this.deleteMessage(_id);
              break;
            default:
              break;
          }
        },
      );
    }
  };

  render() {
    return (
      <View style={[styles.container]}>
        {this.renderBackground()}
        <GiftedChat
          ref={(c) => {
            this._GiftedMessenger = c;
          }}
          messages={this.props.messages}
          onSend={this.onSendMessage}
          loadEarlier={this.props.channelHasMore}
          onLoadEarlier={this.onLoadEarlier}
          renderMessageText={this.renderText}
          renderTime={this.renderTime}
          isLoadingEarlier={this.props.isLoadingEarlier}
          keyboardShouldPersistTaps="handled"
          listViewProps={{
            style: { flex: 1, backgroundColor: 'transparent' },
            contentContainerStyle: {
              paddingBottom: 64,
              backgroundColor: 'transparent',
            },
            keyboardDismissMode: 'on-drag',
            keyboardShouldPersistTaps: 'handled',
          }}
          user={this.user}
          onPressAvatar={this.onPressAvatar}
          renderAccessory={this.renderAccessory}
          renderChatFooter={this.renderChatFooter}
          renderLoading={Loading}
          parseText
          isAnimated
          onLongPress={this.onLongPress}
          renderAvatarOnTop={false}
          renderBubble={this.renderBubble}
          renderFooter={this.renderFooter}
          onInputTextChanged={this.onInputTextChanged}
          renderCustomView={this.renderCustomView}
        />
      </View>
    );
  }
}

const wrapperStyle = {
  right: {
    backgroundColor: '#6C5891',
    // color: 'white'
  },
  left: {
    backgroundColor: '#E9EDF0',
    // color: '#57585A'
  },
};

const mergeProps = (state, dispatchProps, ownProps) => {
  const { params = {} } = ownProps.navigation.state;
  const { groupId } = params;

  const {
    chats,
    users,
    firstMessages,
    channelHasMore,
    isLoadingEarlier,
    isTyping,
    ...stateProps
  } = state;

  let chatProps = {};
  if (groupId) {
    const otherUsers = Fire.shared.getOtherUsersFromChatGroup(groupId);
    const otherUserUid = otherUsers[0];
    const otherUser = users[otherUserUid];
    const messages = chats[groupId] || {};
    // console.log({ messages });

    const _channelHasMore = channelHasMore[groupId];
    const firstMessage = firstMessages[groupId];
    const _isTyping = isTyping[groupId];
    const _isLoadingEarlier = isLoadingEarlier[groupId];

    chatProps = {
      groupId,
      otherUsers,
      otherUserUid,
      otherUser,

      firstMessage,
      channelHasMore: _channelHasMore,
      isTyping: _isTyping,
      isLoadingEarlier: _isLoadingEarlier,

      messages: Object.values(messages).sort((a, b) => a.createdAt < b.createdAt),
    };
  }
  return {
    ...ownProps,
    ...dispatchProps,
    ...chatProps,
    ...stateProps,
  };
};

export default connect(
  ({
    isTyping,
    isLoadingEarlier,
    firstMessages,
    channelHasMore,
    chats,
    users,
  }) => ({
    isTyping,
    isLoadingEarlier,
    firstMessages,
    channelHasMore,
    chats,
    users,
  }),
  {},
  mergeProps,
)(Chat);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', // f7f7f7
  },
  footerContainer: {
    marginTop: 5,
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#aaa',
  },
});