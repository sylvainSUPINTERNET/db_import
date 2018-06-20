#!/bin/sh

path=$1

for i in $(ls $path/*.bson)
do
	echo mongorestore --drop $i --db mpec
	mongorestore --drop $i --db mpec

done
