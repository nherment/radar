/* globals describe, it, beforeEach */
var SessionManager = require('../server/session_manager')
var ClientSession = require('../client/client_session')
var chai = require('chai')
chai.use(require('sinon-chai'))
chai.use(require('chai-interface'))
var expect = chai.expect
var sinon = require('sinon')

describe('SessionManager', function () {
  var sessionManager
  beforeEach(function () {
    sessionManager = new SessionManager()
  })

  it('can be instantiated', function () {
    expect(sessionManager).to.be.instanceof(SessionManager)
  })

  it('has interface', function () {
    expect(sessionManager).to.have.interface({
      sessions: Object,
      adapters: Array,
      on: Function,
      once: Function,
      add: Function,
      has: Function,
      length: Function,
      get: Function
    })
  })

  describe('client session adapters', function () {
    it('can be instantiated with adapters', function () {
      var adapters = [{}, {}]
      sessionManager = new SessionManager({adapters: adapters})
      expect(sessionManager.adapters).to.deep.equal(adapters)
    })

    describe('#canAdapt', function () {
      var someObj = {foo: 1}

      it('returns true when an adapter matches', function () {
        var adapterStub1 = {canAdapt: sinon.stub().returns(false)}
        var adapterStub2 = {canAdapt: sinon.stub().returns(true)}
        sessionManager.adapters.push(adapterStub1, adapterStub2)
        expect(sessionManager.canAdapt(someObj))
          .to.be.true
      })
      it('returns false when no adapter matches', function () {
        var adapterStub1 = {canAdapt: sinon.stub().returns(false)}
        sessionManager.adapters.push(adapterStub1)
        expect(sessionManager.canAdapt(someObj))
          .to.be.false
      })
      it('returns false when no adapters', function () {
        expect(sessionManager.canAdapt(someObj))
          .to.be.false
      })
    })

    describe('#adapt', function () {
      var someObj = {foo: 1}
      var adapter
      describe('given a matching adapter', function () {
        var session = {}
        beforeEach(function () {
          adapter = {
            adapt: sinon.stub().returns(session),
            canAdapt: sinon.stub().returns(true)
          }
          sessionManager.adapters.push(adapter)
        })
        it('applies adapter#adapt to obj', function () {
          expect(sessionManager.adapt(someObj))
            .to.equal(session)
          expect(adapter.canAdapt)
            .to.have.been.calledWith(someObj)
          expect(adapter.adapt)
            .to.have.been.calledWith(someObj)
        })
      })
      describe('given no matching adapter', function () {
        beforeEach(function () {
          adapter = {
            adapt: sinon.stub(),
            canAdapt: sinon.stub().returns(false)
          }
        })
        it('returns null', function () {
          expect(sessionManager.adapt(someObj))
            .to.equal(null)
          expect(adapter.adapt)
            .not.to.have.been.called
        })
      })
    })
  })

  describe('when adding a session', function () {
    var clientSession
    beforeEach(function () {
      clientSession = new ClientSession('', 'foo')
      clientSession.once = sinon.spy()
      sessionManager.add(clientSession)
    })

    it('exposes legth of collection', function () {
      expect(sessionManager.length()).to.equal(1)
    })

    it('can check if has id', function () {
      expect(sessionManager.has('foo')).to.be.true
    })

    it('can get by id', function () {
      expect(sessionManager.get('foo'))
        .to.equal(clientSession)
    })

    it('adding same session multiple times has no effect', function () {
      sessionManager.add(clientSession)
      sessionManager.add(clientSession)
      expect(sessionManager.length()).to.equal(1)
      expect(clientSession.once).to.have.callCount(1)
    })

    describe('given a ClientSession', function () {
      var clientSession = new ClientSession('', 2)

      it('can be added', function () {
        sessionManager.add(clientSession)
        expect(sessionManager.has(2))
          .to.be.true
      })
    })

    describe('given a non-ClientSession', function () {
      var someObj = {id: 'one'}

      it('tries to adapt the obj', function () {
        var adapter = {
          canAdapt: sinon.stub().returns(true),
          adapt: sinon.stub().returns(new ClientSession())
        }
        sessionManager.adapters.push(adapter)

        try {
          sessionManager.add(someObj)
        } finally {
          expect(adapter.adapt).to.have.been.calledWith(someObj)
        }
      })

      describe('when can be adapted', function () {
        var adapted = new ClientSession('', 1)
        var adapter

        beforeEach(function () {
          adapter = {
            canAdapt: sinon.stub().returns(true),
            adapt: sinon.stub().returns(adapted)
          }
          sessionManager.adapters.push(adapter)
        })

        it('adds the adapted ClientSession', function () {
          sessionManager.add(someObj)
          expect(sessionManager.has(1))
            .to.be.true
        })
      })
      describe('when cannot be adapted', function () {
        var adapter

        beforeEach(function () {
          adapter = {
            canAdapt: sinon.stub().returns(false)
          }
          sessionManager.adapters.push(adapter)
        })

        it('throws', function () {
          expect(function () {
            sessionManager.add(someObj)
          }).to.throw(TypeError, /adapter/)
        })
      })
    })
  })
})
