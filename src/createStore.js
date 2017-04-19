import isPlainObject from 'lodash/isPlainObject'
import $$observable from 'symbol-observable'

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 *
 * 这是一个 Redux 私有 action，不允许外界触发，
 * 用来初始化 Store tree 状态树，和改变 reducers 后初始化 Store 的状态树。
 */
export const ActionTypes = {
  INIT: '@@redux/INIT'
}

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 *
 * 创建一个 Redux store 来以存放应用中所有的 state，应用中应有且仅有的一个store。
 * 唯一的改变 store 里 data 的方法是 store.dispatch()。
 * 可以通过 combineReducers() 将多个 reducer 合并成一个 reduce。
 *
 * @param {Function} [reducer]【必选】
 *        一个函数返回下一个 state tree，接受参数：currentState、绑定了 dispatch 的 action。
 * @param {any} [preloadedState]【可选】
 *        初始化 state 对象。数据可以来自 server 端，或者之前保存的数据。
 *        如果使用 combineReducers 生成 reducer，必须保持状态对象的 key 和 combineReducers 中的 key 相对应。
 * @param {Function} [enhancer]【可选】
 *        store 的增强器函数。可以指定为第三方的中间件，时间旅行，持久化等，但是此函数只能用 Redux 提供的 applyMiddleware 函数来生成。
 * @returns {Store} [Object]
 *        返回一个 Redux store。可以用来订阅 state tree 变化，dispatch actions等。
 *        {dispatch, subscribe, getState, replaceReducer, [$$observable]}
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 判断参数，如果 preloadedState 是函数，那么传参是这样：createStore(reducer, enhancer)。
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    // 如果有 enhancer，但是不是函数，抛出错误
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    // 利用 enhancer 增强 createStore
    return enhancer(createStore)(reducer, preloadedState)
  }

  // 如果 reducer 不是一个函数，抛出错误
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  // 储存当前 reducer
  let currentReducer = reducer
  // 储存当前状态树
  let currentState = preloadedState
  // 储存当前的监听函数列表
  let currentListeners = []
  // 储存下一个监听函数列表
  let nextListeners = currentListeners
  // 是否正在触发
  let isDispatching = false
  
  // 这个函数可以根据当前监听函数的列表生成新的下一个监听函数列表引用
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   * 返回当前应用的 state tree 状态树。
   * 这是一个闭包，这个参数会持久存在，并且所有的操作状态都是改变这个引用。
   */
  function getState() {
    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   *
   * 给 Store 添加订阅监听函数，一旦调用 dispatch，所有的监听函数就会执行，State tree 将发生改变。
   * nextListeners 就是储存当前监听函数的列表，
   * 调用 subscribe，传入一个函数作为参数，那么就会给 nextListeners 列表 push 这个函数。
   */
  function subscribe(listener) {
    // 如果 listener 不是函数，抛出错误
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    let isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    // 返回取消订阅的函数
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   *
   * 触发状态改变的，参数为 action 对象。
   */
  function dispatch(action) {
    // 如果不是普通对象，抛出错误
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
        'Use custom middleware for async actions.'
      )
    }

    // 如果 action.type 未定义，抛出错误
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
        'Have you misspelled a constant?'
      )
    }

    // 如果当前正在 dispatch，抛出错误
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    // 标记正在 dispatch，并执行 reducer(currentState, action)。
    // reducer函数根据 action 的属性以及当前 store 的状态来生成一个新的状态，并赋予当前状态，改变 store 的状态。
    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    // 同时执行此 action 相关订阅监听器
    const listeners = currentListeners = nextListeners
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    // 默认返回 action
    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   *
   * 此函数用来替换 Store 当前的 reducer 函数，然后触发私有 action 重新初始化状态树。
   */
  function replaceReducer(nextReducer) {
    // 如果新的 reducer 不是函数，抛出错误
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.INIT })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   * 此函数不直接暴露给开发者，它提供了给其他观察者模式／响应式库的交互操作接口
   */
  function observable() {
    // 定义一个外部订阅函数
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  // 当 Store 被创建后，立即触发私有 action ，根据 reducer 来初始化 Store tree 状态树。
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
