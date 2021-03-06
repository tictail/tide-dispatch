import {test} from 'ava'
import {init} from '../src'
import {Tide} from 'tide'
import {spy} from 'sinon'
import {Record, Map} from 'immutable'

const tide = new Tide()
const record = new Record({
  bar: Map({beer: 'singha'}),
  food: null,
})

tide.setState(record(Map()))

const timingMiddleware = (logger) => (fn, name) => {
  return function() {
    const start = new Date()
    const rv = fn(...arguments)
    const end = function(ret) {
      logger(new Date() - start)
    }
    if (rv && typeof rv.then === 'function') {
      rv.then(end, end)
    } else {
      end()
    }
    return rv
  }
}

const logSpy = spy()
const middleSpy = spy(timingMiddleware(logSpy))
const secondLogSpy = spy()
const secondMiddleSpy = spy(timingMiddleware(secondLogSpy))
const actionSpy = spy((input) => input || 'Singha')

init(tide, {
  bar: {
    getSlowBeer: () => new Promise((resolve) => {
      setTimeout(() => { resolve('bajs') }, 10)
    }),
    getBeer: actionSpy,
  },
}, [middleSpy, secondMiddleSpy])

test('should use middleware to time execution of sync and async function', (t) => {
  t.plan(16)
  tide.fire('bar.getBeer').then((res) => t.is(res, 'Singha', 'action returns correct value'))
  t.true(middleSpy.calledOnce, 'Middleware is called')
  t.true(secondMiddleSpy.calledOnce, 'both middleware are called')
  t.is(middleSpy.lastCall.args[1], 'bar.getBeer', 'Middleware gets action name as 2nd argument')
  tide.fire('bar.getBeer', 'XXXX').then((res) => t.is(res, 'XXXX', 'action uses data'))
  t.deepEqual(actionSpy.lastCall.args[0], 'XXXX', 'action gets right arguments')
  t.true(typeof actionSpy.lastCall.args[1] === 'object', 'action gets right arguments')
  t.true(typeof actionSpy.lastCall.args[1].get === 'function', 'action gets right arguments')
  t.true(typeof actionSpy.lastCall.args[1].set === 'function', 'action gets right arguments')
  t.true(typeof actionSpy.lastCall.args[1].tide === 'object', 'action gets right arguments')
  t.true(middleSpy.calledTwice, 'middleware is called again')
  t.true(secondMiddleSpy.calledTwice, 'both middleware are called')
  t.true(logSpy.lastCall.args[0] >= 0, 'logging middeware works')
  return tide.fire('bar.getSlowBeer').then(() => {
    t.is(middleSpy.callCount, 3, 'async middeware gets called')
    t.is(secondMiddleSpy.callCount, 3, 'both middleware are called')
    t.true(logSpy.lastCall.args[0] >= 10, 'async middleware can time execution')
  })
})
