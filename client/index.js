/*
 * Labqueue. Copyright (c) 2015, 2016, 2017, Linus Karlsson
 * See LICENSE file at https://github.com/zozs/labqueue
 */

import io from 'socket.io-client'
import React from 'react'
import ReactDOM from 'react-dom'

import Labqueue from './Labqueue'

/* css */
import 'bootstrap/dist/css/bootstrap.css'

let isAdmin = window.location.hash === '#admin'

ReactDOM.render(
  <Labqueue isAdmin={isAdmin} />,
  document.getElementById('root')
)

/* Offer restyling :) */
document.getElementById('haxxor-theme').addEventListener('click', () => {
  document.getElementById('css-theme').setAttribute('href', 'haxxor.css')
}, false)

document.getElementById('standard-theme').addEventListener('click', () => {
  document.getElementById('css-theme').setAttribute('href', 'index.css')
}, false)
