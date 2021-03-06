'use strict';

describe('inspectedApp', function() {
  var inspectedApp, rootScope, port;

  beforeEach(function() {
    module('batarang.inspected-app')
    window.chrome = createMockChrome();
    inject(function(_inspectedApp_, _$rootScope_) {
      inspectedApp = _inspectedApp_;
      rootScope = _$rootScope_;
      spyOn(rootScope, '$broadcast');
    });
  });

  describe('when instantiated', function () {
    it('should post a message with the inspected tabId', function () {
      expect(port.postMessage).
          toHaveBeenCalledWith(window.chrome.devtools.inspectedWindow.tabId);
    });
  });

  describe('messaging', function () {
    it('should track hints', inject(function ($browser) {
      port.onMessage.trigger(JSON.stringify({ message: 'hi' }));
      $browser.defer.flush();
      expect(inspectedApp.hints).toEqual([{message: 'hi'}]);
    }));

    it('should track new scopes', inject(function ($browser) {
      port.onMessage.trigger(JSON.stringify({ event: 'scope:new', data: { child: 1 } }));
      $browser.defer.flush();

      expect(inspectedApp.scopes).toEqual({ 1: { parent: undefined, children: [], models: {} } });
    }));

    it('should track updates to scope descriptors', inject(function ($browser) {
      port.onMessage.trigger(JSON.stringify({ event: 'scope:new', data: { child: 1 } }));
      port.onMessage.trigger(JSON.stringify({ event: 'scope:link', data: { id: 1, descriptor: 'pasta' } }));
      $browser.defer.flush();

      expect(inspectedApp.scopes[1].descriptor).toBe('pasta');
    }));
    it('should broadcast message from $rootScope', inject(function ($browser) {
      var message = { event: 'scope:new', data: { child: 1 } };
      port.onMessage.trigger(JSON.stringify(message));
      $browser.defer.flush();

      expect(rootScope.$broadcast).toHaveBeenCalledWith(message.event, message.data);
    }));
  });

  describe('watch', function () {
    it('should call chrome devtools APIs', function() {
      inspectedApp.watch(1, '');
      expect(chrome.devtools.inspectedWindow.eval).toHaveBeenCalledWith('angular.hint.watch(1,"")');
    });
  });

  describe('unwatch', function () {
    it('should call chrome devtools APIs', function() {
      inspectedApp.unwatch(1, '');
      expect(chrome.devtools.inspectedWindow.eval).toHaveBeenCalledWith('angular.hint.unwatch(1,"")');
    });
  });


  describe('inspectScope', function () {
    it('should call chrome devtools APIs', function() {
      inspectedApp.inspectScope(2);
      expect(chrome.devtools.inspectedWindow.eval).toHaveBeenCalledWith('angular.hint.inspectScope(2,"")');
    });
  });

  function createMockChrome() {
    return {
      runtime: {
        connect: function () {
          return port = createMockSocket();
        }
      },
      devtools: {
        inspectedWindow: {
          tabId: 1,
          eval: jasmine.createSpy('inspectedWindowEval')
        }
      }
    };
  }
});

function createListenerSpy(name) {
  var symbol = '_' + name;

  var listener = {
    addListener: function (fn) {
      listener[symbol].push(fn);
    },
    removeListener: function (fn) {
      listener[symbol].splice(fn, 1);
    },
    trigger: function () {
      var args = arguments;
      listener[symbol].forEach(function (fn) {
        fn.apply(listener, args);
      });
    }
  };

  listener[symbol] = [];
  return listener;
}

function createMockSocket() {
  return {
    onMessage: createListenerSpy('messageFunction'),
    postMessage: jasmine.createSpy('postMessageFunction'),
    onDisconnect: createListenerSpy('onDisconnect')
  };
}
