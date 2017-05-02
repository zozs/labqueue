import React from 'react'
import LabqueueQueueRow from './LabqueueQueueRow'

export default class LabqueueQueue extends React.Component {
  render() {
    let rows = this.props.queue.map((r, pos) => {
      return <LabqueueQueueRow row={r} position={pos + 1} clientName={this.props.clientName} key={r.subject} />
    })
    
    return (
      <section className="queue">
        <div className="row">
          <div className="col-md-6">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Computer</th>
                </tr>
              </thead>

              <tbody>
                { rows }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    )
  }
}
