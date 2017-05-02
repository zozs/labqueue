import React from 'react'

export default class LabqueueButtons extends React.Component {
  render() {
    if (this.props.isAdmin) {
      return (
        <section className="labqueue-buttons">
          <button type="button" className="btn btn-lg btn-danger" onClick={this.props.remove}>Remove</button>
          <span> </span>
          <button type="button" className="btn btn-lg btn-warning" onClick={this.props.undelete}>Undo removal</button>
        </section>
      )
    } else {
      if (this.props.clientInQueue) {
        return (
          <section className="labqueue-buttons">
            <button type="button" className="btn btn-lg btn-success" onClick={this.props.dontHelp}>Don't help me!</button>
          </section>
        )
      } else {
        return (
          <section className="labqueue-buttons">
            <button type="button" className="btn btn-lg btn-primary" onClick={this.props.help}>Help me!</button>
          </section>
        )
      }
    }
  }
}
