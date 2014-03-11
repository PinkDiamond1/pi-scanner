#!/usr/bin/env ruby
# encoding: utf-8
#
# Created by Nat Noordanus on 2013-12-13.

# This script was used to determine that the first occurance of two consecutive
# occurrences of the same digit in base ten Pi with more than 255 decimal places
# between them is after at least 3.254 trillion digits. This question was
# motivated to determine the feasibility of representing the locations of digits
# of pi as the number of decimal places since the last occrance of the same
# digit, as a single 8 bit byte.

# Description:
# Analyses the  digits of pi to determine the greatest number of decimal places
# separating consecutive occurrences of the same digit.
# The purpose is to discover the first gap of more than 255 decimal places
#  between consecutive occurrences of a base 10 digit in pi.
# Downloads segments of 100 000 000 digits at a time as zipped text files from
#  http://piworld.calico.jp/value/pi-100b/pi-0001.zip up to
#  http://piworld.calico.jp/value2/pi-10000b/pi-60000.zip
#  see http://piworld.calico.jp/estart.html for full index of digits
# Manages a worklist of up to a certain number of segments to analyse or
#  download simultaneously, as an attempt to maximise bandwidth usage.
# Analysed data is removed to keep disk usage minimal.

# Usage:
# A clean working directory within which to execute the script is recommended
# Requires the aria2 download utility => http://aria2.sourceforge.net/

require 'json'

# Analyses up to 6 trillian digits of Pi to determine the maximum distance
#  between consecutive occurrences of the same digit for each base 10 digit.
#
# @param start [Integer] of segement (up of 100million) to start on.
#
# @param worklist_size [Integer] of segments to be either be processing,
#  waiting to process, or downloading at any one time.
#
# @return [Array] representing the maximum observed decimal distances for digits
#  0 to 9 respectively.
def analyze_pi
  file_name = lambda { |file_number, ext|
    "pi-#{"%04d" % file_number}.#{ext}" }
  download_command = lambda { |file_number|
    block_number = 1 + (file_number-1) / 1000
    "aria2c -x 4 http://piworld.calico.jp/value/pi-#{block_number}00b/#{file_name.call file_number, 'zip'}" }
  throttle = 1

  if loaded_state = load_state
    puts loaded_state
    start = loaded_state["start"]
    worklist_size = loaded_state["worklist_size"]
    gobal_position = loaded_state["gobal_position"]
    digit_positions = loaded_state["digit_positions"]
    digit_distances = loaded_state["digit_distances"]
    max = loaded_state["max"]
    throttle = loaded_state["throttle"] if loaded_state["throttle"]
  else
    # defaults
    start = 1
    worklist_size = 1
    gobal_position = 0
    digit_positions = [0,0,0,0,0, 0,0,0,0,0]
    digit_distances = [0,0,0,0,0, 0,0,0,0,0]
    max = 100000
  end

  active_downloads = []
  downloaded_segments = []

  # 60000 seems to be the last file that's actually available
  download_numbers = (start..max).to_a
  analyse_numbers = (start..max).to_a

  # main loop checks whether there is downloaded data to process or room for more downloads.
  until download_numbers.empty? and analyse_numbers.empty?

    # start another download if there's not enough happening already
    if downloaded_segments.count + active_downloads.count < worklist_size and not download_numbers.empty?
      file_number = download_numbers.shift
      log "Download Initiated: #{file_name.call file_number, 'zip'}"
      active_downloads << {
        file_number: file_number,
        thread: Thread.new {
           IO.popen(download_command.call(file_number)) { |child| child.read }
      } }
    end

    # if the next segment is available then process it
    if downloaded_segments.include? analyse_numbers[0]
      active_segment = analyse_numbers.shift
      downloaded_segments.delete active_segment

      zipfile_path = "./#{file_name.call active_segment, 'zip'}"
      txtfile_path = "./#{file_name.call active_segment, 'txt'}"

      `unzip #{zipfile_path}`
      `rm #{zipfile_path}`

      log "Analyzing #{txtfile_path}"

      pi_file = File.open(txtfile_path,'r')
      file_digit_distances = [0,0,0,0,0, 0,0,0,0,0]

      pi_file.each_line do |l|
        l.split(':')[0].gsub(/\s+/, "").each_char do |c|
          d = c.to_i

          new_distance = gobal_position - digit_positions[d]
          file_digit_distances[d] = new_distance if new_distance > file_digit_distances[d]
          digit_positions[d] = gobal_position

          gobal_position += 1
        end

        digit_distances.each_index { |i|  digit_distances[i] = [digit_distances[i], file_digit_distances[i]].max }
      end

      # remove processed segment file
      `rm #{txtfile_path}`

      # report findings from this file
      log "digit_positions :        #{digit_positions}"
      log "file_digit_distances :   #{file_digit_distances}"
      log "digit_distances :        #{digit_distances}"

      save_state({
        :start => active_segment,
        :worklist_size => worklist_size,
        :gobal_position => gobal_position,
        :digit_positions => digit_positions,
        :digit_distances => digit_distances,
        :max => max
      })
    end

    # Check for completed downloads
    active_downloads.map! do |download|
      unless download[:thread].alive?
        log "Download Completed: #{file_name.call download[:file_number], 'zip'}"
        downloaded_segments << download[:file_number]
        nil
      else
        download
      end
    end.compact!

    sleep throttle # let the cpu idle if there's nothing to do
  end
  digit_distances
end


# A helper function that both prints a given message and logs it with a
#  timestamp to a file in the present working directory
#
# @param msg [String] to be logged.
def log msg
  File.open('pi_analysis_log.txt','a') { |f| f.puts "#{Time.now} : #{msg}"}
  #puts "---- LOG ----"
  puts msg
  #puts "---- *** ----"
end

def save_state params
  `rm pi_analysis_save.json`
  File.open('pi_analysis_save.json','w') { |f| f.puts JSON.dump params }
end

def load_state
  begin
    JSON.load File.open('pi_analysis_save.json','r').read
  rescue
    false
  end
end

analyze_pi