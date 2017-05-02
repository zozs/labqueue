import React from 'react'

export default class LabqueueQueueRow extends React.Component {
  render() {
    return (
      <tr className={ this.props.clientName === this.props.row.subject ? 'highlight' : '' }>
        <td>{ this.props.position }</td>
        <td>{ this.props.row.subject }</td>
      </tr>
    )
  }
}
