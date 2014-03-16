'use strict'


angular.module('piScanner', [])

.service 'spinner', () ->
  default_opts =
    lines: 9,
    length: 8,
    width: 4,
    radius: 6,
    corners: 1,
    rotate: 0,
    direction: 1,
    color: '#000',
    speed: 1,
    trail: 28,
    shadow: false,
    hwaccel: false,
    className: 'spinner',
    zIndex: 2e9,
    top: '17px',

  spinners =
    range:
      opts:
        left: '75px'
      target: -> document.getElementById('range-spinner')
    scan:
      opts:
        left: '53px'
      target: -> document.getElementById('scan-spinner')

  start: (s) ->
    if 'spinner' of spinners[s]
      spinners[s].spinner.spin(spinners[s].target())
    else
      spinners[s].spinner = new Spinner(angular.extend default_opts, spinners[s].opts)
      spinners[s].spinner.spin(spinners[s].target())
  stop: (s) ->
    if 'spinner' of spinners[s]
      spinners[s].spinner.stop()

.controller 'mainCtrl', ($scope, $http, spinner) ->
  $scope.query =
    sequence: ''
    range_start: ''
    range_end: ''

  $scope.state =
    scan_active: false
    range_active: false

  $scope.response =
    scan: null
    scan_error: ''
    range: null
    range_error: ''

  $scope.$watch 'state.scan_active', (active) ->
    if active
      spinner.start('scan')
    else
      spinner.stop('scan')

  $scope.$watch 'state.range_active', (active) ->
    if active
      spinner.start('range')
    else
      spinner.stop('range')

  $scope.scan = () ->
    $scope.response.scan= null
    $scope.response.scan_error = ''
    $scope.state.scan_active = true

    query = $scope.query.sequence.replace(/\s/g, '')
    return unless query.length

    req = $http.get("/find/#{query}")
    req.then (data, status, headers, config) ->
      $scope.state.scan_active = false
      $scope.response.scan = data.data
    req.error (data, status, headers, config) ->
      $scope.state.scan_active = false
      switch status
        when 400
          $scope.response.scan_error = 'I can\'t scan for that! Digits only please.'
        else
          $scope.response.scan_error = 'Uh oh, something went wrong, might have been an issue with the server, like it might be trying to deal with too many requests just now.'

  $scope.range = () ->
    $scope.response.range = null
    $scope.response.range_error = null
    $scope.state.range_active = true

    query_start = String($scope.query.range_start).replace(/\s/g, '')
    query_end = String($scope.query.range_end).replace(/\s/g, '')
    unless query_start.length
      $scope.query.range_start = query_start = 0
    unless query_end.length
      $scope.query.range_end = query_end = query_start + 10000

    req = $http.get("/range/#{query_start}:#{query_end}")
    req.then (data, status, headers, config) ->
      $scope.state.range_active = false
      $scope.response.range = data.data
      $scope.response.range.start = $scope.response.range.query[0]
      $scope.response.range.end = $scope.response.range.query[1]
    req.error (data, status, headers, config) ->
      $scope.state.range_active = false
      switch status
        when 422
          $scope.response.range_error = 'Invalid range: the end position needs to be after the start position, and they both need to be position'
        when 403
          $scope.response.range_error = 'Sorry, you can only request up to 100000 digits at a time'
        else
          $scope.response.range_error = 'Uh oh, something went wrong, might have been an issue with the server'
