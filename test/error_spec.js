import {test} from 'ava'
import {fire, init, addActions} from '../src'
import {Base} from 'tide'
import {Record, Map} from 'immutable'

const tide = new Base()
const record = new Record({
  bar: Map({beer: 'singha'}),
})
tide.setState(record(Map()))
init(tide, {
  foo: () => new Promise((resolve) => resolve({
    bar: () => 'Beer',
  })),
  bar: {
    getBeer: () => 'Singha',
    getDrink: () => new Promise((resolve) => {
      setTimeout(() => { resolve('Margerita') }, 1)
    }),
  },
})

test('should throw when calling non-existing action', (t) => {
  t.throws(() => fire('bar.getWine'))
  t.throws(() => fire('gym.getBeer'))
  t.throws(() => fire('notHere.atAll'), 'Can\'t find action object notHere')
})

test('should throw when adding non-action', (t) => {
  t.throws(() => addActions('stupid.string'))
})

test('should throw when initializing without a tide instance', (t) => {
  t.throws(() => init('nada'))
})

test('should throw when fire throws', (t) => {
  addActions({oops: {doh() { throw Error('Doh!') }}})
  t.throws(() => fire('oops.doh'), 'Doh!')
})

test('should throw when action path is invalid', (t) => {
  t.throws(() => fire('noDotCantDispatch'))
  t.throws(() => fire('too.many.dots.cant.handle'))
})

test('should pass on catch errors when action throws in promise', (t) => {
  t.plan(2)
  addActions({oops: {
    pinky: () => new Promise(() => { throw Error('Doh!') }),
  }})
  return fire('oops.pinky').catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'Error in fire(oops.pinky): Doh!')
  })
})
