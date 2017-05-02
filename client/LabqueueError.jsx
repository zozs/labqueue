import React from 'react'

export default class LabqueueError extends React.Component {
  render() {
    return (
      <div className="alert alert-danger" role="alert">
        <strong>Error!</strong> <span className="error-box-text">{ this.props.message }</span>
      </div>
    )
  }
}

