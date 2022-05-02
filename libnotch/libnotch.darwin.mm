#include <nan.h>
#include <node.h>
#include <Cocoa/Cocoa.h>

using namespace v8;

void GetNotchInfo(const Nan::FunctionCallbackInfo<Value>& args) {
    // Get all expected arguments as integers.
    Isolate* isolate = args.GetIsolate();
    if (args.Length() != 2) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Wrong number of arguments").ToLocalChecked()));
        return;
    }
    Local<Value> firstArg = args[0];
    if (!firstArg->IsNumber()) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Argument is not a number").ToLocalChecked()));
        return;
    }
    int boundsX = firstArg.As<Number>()->Value();
    Local<Value> secondArg = args[1];
    if (!firstArg->IsNumber()) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Argument is not a number").ToLocalChecked()));
        return;
    }
    int boundsY = secondArg.As<Number>()->Value();

    // Attempt to find the screen notch.
    if (@available(macOS 12, *)) {
        NSArray* screens = [NSScreen screens];
        for (NSScreen* screen in screens) {
            NSRect rect = [screen frame];
            if (NSMinX(rect) == boundsX && NSMinY(rect) == boundsY) {
                NSEdgeInsets insets = [screen safeAreaInsets];
                args.GetReturnValue().Set(insets.top);
                return;
            }
        }
    }
}

void Initialize(Local<Object> exports) {
    Local<Context> context = exports->CreationContext();
    exports->Set(context,
        Nan::New("getNotchInfo").ToLocalChecked(),
        Nan::New<FunctionTemplate>(GetNotchInfo)
            ->GetFunction(context)
            .ToLocalChecked());
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
