STEPS = step0_repl step1_read_print step2_eval step3_env \
	step4_if_fn_do step5_tco step6_file step7_quote \
	step8_macros step9_try stepA_mal

BUILD_FILES = $(foreach s,$(STEPS),build/bin/$(s).js)
SRC_FILES = $(foreach s,$(STEPS),src/bin/$(s).ts)

all: ts

node_modules: package-lock.json
	npm install

build/step%.js &: node_modules $(SRC_FILES)
	./node_modules/.bin/tsc


.PHONY: ts clean

ts: $(BUILD_FILES)

clean:
	rm -f $(BUILD_FILES)

%:
	make -C ../.. "$@"
