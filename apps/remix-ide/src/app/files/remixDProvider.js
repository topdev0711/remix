'use strict'
var EventManager = require('../../lib/events')

module.exports = class RemixDProvider {
  constructor (appManager) {
    this.event = new EventManager()
    this._appManager = appManager
    this.type = 'localhost'
    this.error = { 'EEXIST': 'File already exists' }
    this._isReady = false
    this._readOnlyFiles = {}
    this._readOnlyMode = false
    this.filesContent = {}
    this.files = {}
  }

  _registerEvent () {
    var remixdEvents = ['connecting', 'connected', 'errored', 'closed']
    remixdEvents.forEach((value) => {
      this._appManager.on('remixd', value, (event) => {
        this.event.trigger(value, [event])
      })
    })

    this._appManager.on('remixd', 'notified', (data) => {
      if (data.scope === 'sharedfolder') {
        if (data.name === 'created') {
          this.init(() => {
            this.event.trigger('fileAdded', [this.type + '/' + data.value.path, data.value.isReadOnly, data.value.isFolder])
          })
        } else if (data.name === 'removed') {
          this.init(() => {
            this.event.trigger('fileRemoved', [this.type + '/' + data.value.path])
          })
        } else if (data.name === 'changed') {
          this._appManager.call('remixd', 'get', {path: data.value}, (error, content) => {
            if (error) {
              console.log(error)
            } else {
              var path = this.type + '/' + data.value
              this.filesContent[path] = content
              this.event.trigger('fileExternallyChanged', [path, content])
            }
          })
        } else if (data.name === 'rootFolderChanged') {
          // new path has been set, we should reset
          this.event.trigger('folderAdded', [this.type + '/'])
        }
      }
    })
  }

  isConnected () {
    return this._isReady
  }

  close (cb) {
    this._isReady = false
    cb()
  }

  init (cb) {
    if (this._isReady) return cb()
    this._appManager.call('remixd', 'folderIsReadOnly', {})
    .then((result) => {
      this._isReady = true
      this._readOnlyMode = result
      this._registerEvent()
      cb && cb()
    }).catch((error) => {
      cb && cb(error)
    })
  }

  exists (path, cb) {
    const unprefixedpath = this.removePrefix(path)

    return this._appManager.call('remixd', 'exists', { path: unprefixedpath })
    .then((result) => {
      if(cb) return cb(null, result)
      return result
    }).catch((error) => {
      if(cb) return cb(error)
      throw new Error(error)
    })
  }

  getNormalizedName (path) {
    return path
  }

  getPathFromUrl (path) {
    return path
  }

  get (path, cb) {
    var unprefixedpath = this.removePrefix(path)
    this._appManager.call('remixd', 'get', { path: unprefixedpath })
    .then((file) => {
      this.filesContent[path] = file.content
      if (file.readonly) { this._readOnlyFiles[path] = 1 }
      cb(null, file.content)
    }).catch((error) => {
      // display the last known content.
      // TODO should perhaps better warn the user that the file is not synced.
      if (this.filesContent[path]) return cb(null, this.filesContent[path])
      else cb(error)
    })
  }

  async set (path, content, cb) {
    const unprefixedpath = this.removePrefix(path)
    const exists = await this.exists(path)
    

    return this._appManager.call('remixd', 'set', { path: unprefixedpath, content: content }).then(async (result) => {
      const path = this.type + '/' + unprefixedpath

      if (!exists) {
        const isDirectory = await this.isDirectory(path)

        if (isDirectory) this.event.trigger('folderAdded', [path])
        else this.event.trigger('fileAdded', [path])
      } else {
        this.event.trigger('fileChanged', [path])
      }
      if (cb) return cb(null, result)
    }).catch((error) => {
      if (cb) return cb(error)
      throw new Error(error)
    })
  }

  isReadOnly (path) {
    return this._readOnlyMode || this._readOnlyFiles[path] === 1
  }

  remove (path) {
    return new Promise((resolve, reject) => {
      const unprefixedpath = this.removePrefix(path)
      this._appManager.call('remixd', 'remove', { path: unprefixedpath })
      .then(result => {
        const path = this.type + '/' + unprefixedpath

        delete this.filesContent[path]
        resolve(true)
        this.init(() => {
          this.event.trigger('fileRemoved', [path])
        })
      }).catch(error => {
        if (error) console.log(error)
        resolve(false)
      })
    })
  }

  rename (oldPath, newPath, isFolder) {
    const unprefixedoldPath = this.removePrefix(oldPath)
    const unprefixednewPath = this.removePrefix(newPath)

    return this._appManager.call('remixd', 'rename', { oldPath: unprefixedoldPath, newPath: unprefixednewPath })
    .then(result => {
      const newPath = this.type + '/' + unprefixednewPath
      const oldPath = this.type + '/' + unprefixedoldPath

      this.filesContent[newPath] = this.filesContent[oldPath]
      delete this.filesContent[oldPath]
      this.init(() => {
        this.event.trigger('fileRenamed', [oldPath, newPath, isFolder])
      })
      return result
    }).catch(error => {
      console.log(error)
      if (this.error[error.code]) error = this.error[error.code]
      this.event.trigger('fileRenamedError', [this.error[error.code]])
    })
  }

  isExternalFolder (path) {
    return false
  }

  removePrefix (path) {
    path = path.indexOf(this.type) === 0 ? path.replace(this.type, '') : path
    if (path[0] === '/') return path.substring(1)
    return path
  }

  resolveDirectory (path, callback) {
    var self = this
    if (path[0] === '/') path = path.substring(1)
    if (!path) return callback(null, { [self.type]: { } })
    const unprefixedpath = this.removePrefix(path)
    this._appManager.call('remixd', 'resolveDirectory', { path: unprefixedpath }).then((result) => {
      console.log('result: ', result)
      callback(null, result)
    }).catch(callback)
  }

  async isDirectory (path) {
    const unprefixedpath = this.removePrefix(path)

    return await this._appManager.call('remixd', 'isDirectory', {path: unprefixedpath})
  }

  async isFile (path) {
    const unprefixedpath = this.removePrefix(path)

    return await this._appManager.call('remixd', 'isFile', { path: unprefixedpath })
  }
}
