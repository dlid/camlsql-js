
var gulp = require("gulp");
var concat = require("gulp-concat");
var clean = require('gulp-clean');
var inject = require('gulp-inject-string');
var minify = require('gulp-minify');
var wrap = require('gulp-wrap');
var path = require('path');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var reload      = browserSync.reload;

var script_header = function () {
    var headerComment = "/*! */\n",
        containerStart = "",
        containerEnd = "";



    return [headerComment + containerStart, containerEnd];
}
 
gulp.task('serve-watch', function() {  
    gulp.watch('src/**/*.js' , ['build-js']);
    gulp.watch('src/**/*.html' , ['copy-html', 'copy-img']);
    gulp.watch('src/**/*.less' , ['build-less']);
});

gulp.task('serve-serve', function () {
 
    // Serve files from the root of this project
    browserSync.init({
        server: {
            baseDir: "./dist/"
        }
    }); 
     gulp.watch("./dist/**/*.html").on("change", reload);
     gulp.watch("./dist/**/*.js").on("change", reload);
});

gulp.task('build-js',  function () { //['build-clean'],
    return gulp.src([
        'src/header.js',
        'src/where-parser.js',
        'src/sp-exec.js',
        'src/index.js',
        'src/footer.js',
        'src/help-functions.js'
    ])
   // .pipe(sourcemaps.init())
    .pipe(wrap("\n\n\t/* File: <%= file.path %>  */\n<%= contents %>\n"))
    .pipe(concat('camlsql.js'))
    .pipe(inject.wrap(script_header()[0], script_header()[1]))
    // .pipe(jshint())
   //  .pipe(jshint.reporter('default'))

    // .pipe(indent({
    //     tabs: false,
    //     amount: 2
    // }))
     .pipe(gulp.dest('dist/js'))
    .pipe(minify({
        ext: {
            min: '.min.js'
        }
    }))
    // //.pipe(sourcemaps.write("dist/js"))
    .pipe(gulp.dest('dist/js'));
});

gulp.task("default", ['build-js']);
gulp.task("serve", ['serve-watch', 'serve-serve']);