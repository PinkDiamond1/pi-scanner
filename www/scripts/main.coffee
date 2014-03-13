'use strict'


angular.module('piScanner', [])


.controller 'mainCtrl', ($scope, $http) ->
  $scope.query =
    sequence: ''
    range_start: ''
    range_end: ''

  $scope.response =
    scan: null
    scan_error: ''
    range: null
    range_error: ''

  $scope.scan = () ->
    $scope.response.scan= null
    $scope.response.scan_error = ''
    req = $http.get("/find/#{$scope.query.sequence}")
    req.then (data, status, headers, config) ->
      $scope.response.scan = data.data
    req.error (data, status, headers, config) ->
      $scope.response.range_error = 'Uh oh, something went wrong, might have been an issue with the server'

  $scope.range = () ->
    $scope.response.range = null
    $scope.response.range_error = null
    req = $http.get("/range/#{$scope.query.range_start}:#{$scope.query.range_end}")
    req.then (data, status, headers, config) ->
      $scope.response.range = data.data
      $scope.response.range.start = $scope.response.range.query[0]
      $scope.response.range.end = $scope.response.range.query[1]
    req.error (data, status, headers, config) ->
      switch status
        when 422
          $scope.response.range_error = 'Invalid range: the end position needs to be after the start position, and they both need to be position'
        when 403
          $scope.response.range_error = 'Sorry, you can only request up to 1000 digits at a time'
        else
          $scope.response.range_error = 'Uh oh, something went wrong, might have been an issue with the server'
