import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 *
 * 
 * @param {...Function} middlewares 中间件数组列表
 * @returns {Function}
 *          返回函数就是 enhancer，接受 createStore 函数，再返回一个函数，
 *          接受的其实只有 reducer 和 preloadedState。
 * applyMiddleware 函数的作用是组合多个中间件等，然后返回一个函数。
 * 例子:
 * const store = createStore(
 *    reducers,
 *    initialState,
 *    compose(
 *      applyMiddleware(...middleware),
 *      DevTools.instrument()
 *    )
 * );
 */
export default function applyMiddleware(...middlewares) {
  return (createStore) => (reducer, preloadedState, enhancer) => {
    // 创建 store
    const store = createStore(reducer, preloadedState, enhancer)
    // 缓存原有 store.dispatch
    let dispatch = store.dispatch
    let chain = []

    // 把 store 的 getState 和 dispatch 接口暴露给中间件来操作
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    }
    // 每个中间件都会接收 store 的 getState 和 dispatch 接口
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    // 生成新的 dispatch
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
