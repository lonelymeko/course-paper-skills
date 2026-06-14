#!/usr/bin/env ruby
require "yaml"

Dir["skills/*/SKILL.md"].sort.each do |file|
  text = File.read(file)
  match = text.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  unless match
    warn "ERR #{file}: missing YAML frontmatter"
    exit 1
  end

  YAML.safe_load(match[1])
  puts "OK #{file}"
rescue StandardError => error
  warn "ERR #{file}: #{error.message}"
  exit 1
end
