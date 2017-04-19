/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 *
 * @param {...Function} funcs
 *        需要合成的多个函数。
 *        预计每个函数都接收一个参数。它的返回值将作为一个参数提供给它左边的函数，以此类推。
 *        例外是最右边的参数可以接受多个参数，因为它将为由此产生的函数提供签名。
 *        效果：compose(funcA, funcB, funcC) => compose(funcA(funcB(funcC())))
 * @returns {Function}
 *        从右到左把接收到的函数合成后的最终函数。
 *        
 * 高阶函数 compose 接受一组函数参数，从右到左来组合多个函数，然后返回一个组合函数。
 * 当需要把多个 store 增强器依次执行的时候，需要用到它。
 * compose 做的只是让你在写深度嵌套的函数时，避免了代码的向右偏移。
 */

export default function compose(...funcs) {
  // 如果参数为空数组，则返回一个空函数，此函数传入什么返回什么。
  if (funcs.length === 0) {
    return arg => arg
  }

  // 如果参数数组长度为1，则返回第一个函数。
  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
