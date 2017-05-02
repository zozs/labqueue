import React from 'react'

import LabqueueAdminLabels from './LabqueueAdminLabels'
import LabqueueButtons from './LabqueueButtons'
import LabqueueError from './LabqueueError'
import LabqueueQueue from './LabqueueQueue'

import io from 'socket.io-client'

export default class Labqueue extends React.Component {
  constructor (props) {
    super(props)

    this.socket = null
    this.state = {
      queue: [],
      clientName: "",
      error: null,
      isAdmin: this.props.isAdmin,
      clientInQueue: false
    }
  }

  componentDidMount () {
    /* Setup connection to labqueue server. */
    this.socket = io()

    this.socket.on('clientname', name => this.setState({clientName: name})) // Stores client name so we know who we are.
    this.socket.on('queue', queue => this.setState({
      queue: queue.queue,
      error: null,
      clientInQueue: queue.queue.some(e => e.subject === this.state.clientName)
    }))
    this.socket.on('queueFail', error => this.setState({error: error}))

    // Handle dropped connection.
    this.socket.on('reconnect', nbr => this.setState({error: null}))
    this.socket.on('reconnecting', nbr => this.setState({error: 'Connection to queue lost. Reconnecting...'}))

    // It is probably morally questionable to add global event handlers here, but I do it anyway.
    if (this.state.isAdmin) {
      document.addEventListener('keydown', this.handleKeydown, false)
    }
  }

  componentWillUnmount () {
    // Remove global event listeners.
    document.removeEventListener('keydown', this.handleKeydown, false)
  }

  handleKeydown = (e) => {
    /* In admin mode, we listen for Page Down keypress, and use this to pop the
     * top of the queue. Page down corresponds to the "Next" button on my (and
     * virtually all other) powerpoint remotes. The same is applied to page up
     * which is used to undo a removal of a student.
     *
     * Key codes:
     *   8: Backspace
     *  13: Enter
     *  33: Page up
     *  34: Page down
     */
    if (e.which === 34 || e.which === 13) { /* Page down or Enter */
      this.socket.emit('delete')
      e.preventDefault()
    } else if (e.which === 33 || e.which === 8) { /* Page up or Backspace */
      this.socket.emit('undelete')
      e.preventDefault()
    }
  }

  handleHelp = () => this.socket.emit('helpme')
  handleDontHelp = () => this.socket.emit('nevermind')
  handleRemove = () => this.socket.emit('delete')
  handleUndelete = () => this.socket.emit('undelete')

  render () {
    return (
      <div>
        { this.state.isAdmin && <LabqueueAdminLabels queue={this.state.queue} /> }
        <div className="container">
          { this.state.error !== null && <LabqueueError message={this.state.error} /> }
          <LabqueueButtons isAdmin={this.state.isAdmin} clientInQueue={this.state.clientInQueue} help={this.handleHelp} dontHelp={this.handleDontHelp} remove={this.handleRemove} undelete={this.handleUndelete} />
          <LabqueueQueue queue={this.state.queue} clientName={this.state.clientName} />
        </div>
      </div>
    )
  }
}
