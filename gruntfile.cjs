module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    ts: {
      default: {
        tsconfig: './tsconfig.json',
        options: {
          fast: 'never'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-ts');

  grunt.registerTask('default', ['ts']);
};
