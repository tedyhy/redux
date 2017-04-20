import { ActionTypes } from './createStore'
import isPlainObject from 'lodash/isPlainObject'
import warning from './utils/warning'

// 根据 reducer key & action 生成错误信息
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionName = (actionType && `"${actionType.toString()}"`) || 'an action'

  return (
    `Given action ${actionName}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}

// 非线上环境对传参 state 进行验证
function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  const reducerKeys = Object.keys(reducers)
  // 根据 action 类型判断
  const argumentName = action && action.type === ActionTypes.INIT ?
    'preloadedState argument passed to createStore' :
    'previous state received by the reducer'

  // 没有 reducer 时报错
  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  // 如果传参 state 不是普通对象，抛出错误
  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  // 如果传参 state 里的 key 不存在于 reducers 里，则汇总到 unexpectedKeys。
  const unexpectedKeys = Object.keys(inputState).filter(key =>
    !reducers.hasOwnProperty(key) &&
    !unexpectedKeyCache[key]
  )

  // 遍历 unexpectedKeys，标识 unexpectedKeyCache 里的 key。
  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  // 如果 unexpectedKeys 存在，说明有未校验通过的 key，那么将这些 key 信息输出。
  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

// 验证 reducer 是否合法
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]
    const initialState = reducer(undefined, { type: ActionTypes.INIT })

    // 执行当前 reducer 函数进行初始化，如果传入的 state 是 undefined，必须明确的返回初始化 state。
    // 初始化后的 state 不能是 undefined，如果不想设置初始化 state 值，可以返回 null，
    // 但是就是不能为 undefined，否则抛出错误。
    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
        `If the state passed to the reducer is undefined, you must ` +
        `explicitly return the initial state. The initial state may ` +
        `not be undefined. If you don't want to set a value for this reducer, ` +
        `you can use null instead of undefined.`
      )
    }

    // 生成一个以 '@@redux/' 开头的随机 type
    // 当用随机 type 去探测执行当前 reducer 函数返回了 undefined 时，会抛出错误。
    // 不要试图处理类似 '@@redux/*' 命名空间的 action。它们是内部私有 type。此时只需要返回传参 state。
    // 如果传参 state 是 undefined，那么返回的初始化 state 一定不能是 undefined，可以是 null。
    const type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.')
    if (typeof reducer(undefined, { type }) === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
        `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
        `namespace. They are considered private. Instead, you must return the ` +
        `current state for any unknown actions, unless it is undefined, ` +
        `in which case you must return the initial state, regardless of the ` +
        `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 *
 * @param {Object} reducers
 *        一组 reducers 组成的对象，对象的 key 是对应 value（reducer函数）的状态名称。
 *        即：每个 reducer 名称要与 store 里面 state 的 key 相对应。
 * @returns {Function} 返回一个标准的 reducer 函数，真正传入 createStore 的 reducer 函数。
 */
export default function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers)
  // 最终有效的 reducer 列表
  const finalReducers = {}
  // 遍历传参 reducers
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    // 非线上环境的时候提前通知开发者其中一个 reducer 值未定义。
    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    // 如果 reducer 是一个函数，将其放入 finalReducers。
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  // 取最终的 reducers key集合
  const finalReducerKeys = Object.keys(finalReducers)

  // 非线上环境才去缓存校验不通过的 key
  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  // 验证 reducer 是否合法
  let shapeAssertionError
  try {
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }

  // 最终返回的 reducer 函数，参数(State tree, action)
  return function combination(state = {}, action) {
    // 如果之前有验证 reducer 不合法，则调用 combineReducers() 时第一时间抛出错误。
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    // 非线上环境对 state 进行校验
    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache)
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    // 标识 State tree 是否改变
    let hasChanged = false
    // 初始化 nextState
    const nextState = {}
    // 遍历 finalReducerKeys，
    for (let i = 0; i < finalReducerKeys.length; i++) {
      // 当前 reducer 名称
      const key = finalReducerKeys[i]
      // 当前 reducer 函数
      const reducer = finalReducers[key]
      // 当前 reducer 在 State tree 里的值
      const previousStateForKey = state[key]
      // 当前 reducer 根据 action 执行后的 state 值
      const nextStateForKey = reducer(previousStateForKey, action)
      // 如果 reducer 执行后返回的值还是 undefined，抛出错误
      if (typeof nextStateForKey === 'undefined') {
        // 根据 reducer key & action 生成错误信息并抛出
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      // 将新的 state 存入 nextState
      nextState[key] = nextStateForKey
      // 通过 (hasChanged === true || 新的 state 值 !== 老的 state 值) 判断 state 是否发生变化。
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    return hasChanged ? nextState : state
  }
}
