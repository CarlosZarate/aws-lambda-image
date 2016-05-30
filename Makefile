.PHONY: test clean configtest

lambda:
	@echo "Factory package files..."
	@rm -rf build
	@if [ ! -d build ] ;then mkdir build; fi
	@cp index.js build/index.js
	@if [ ! -d build/node_modules ] ;then mkdir build/node_modules; fi
	@cp -R node_modules/ build/
	@cp -R libs build/
	@cp -R bin build/
	@rm -rf build/bin/darwin
	@echo "Create package archive..."
	@cd build && zip -rq aws-lambda-image.zip .
	@mv build/aws-lambda-image.zip ./

clean:
	@echo "clean up package files"
	@if [ -f aws-lambda-image.zip ]; then rm aws-lambda-image.zip; fi
	@rm -rf build/*

localconf:
	@cp config.json /tmp/
