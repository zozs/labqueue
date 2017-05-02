import React from 'react'

export default class LabqueueAdminLabels extends React.Component {
  render() {
    let label = (queue, index) => {
      let text = queue.length > index ? queue[index].subject : ""

      if (text.length > 6) {
        return <span className="longhost">{ text }</span>
      } else if (text.length > 0) {
        return <span>{ text }</span>
      } else { /* hack to render a non-breaking space in case of empty. */
        return <span>{ '\u00A0' }</span>
      }
    }

    let first = label(this.props.queue, 0)
    let second = label(this.props.queue, 1)

    return (
      <div className="container-fluid">
        <div className="row huge-labels">
          <div className="col-md-6 huge-label-current">
            CURRENT<br />
            { first }
          </div>
          <div className="col-md-6 huge-label-next">
            NEXT<br />
            { second }
          </div>
        </div>
      </div>
    )
  }
}

