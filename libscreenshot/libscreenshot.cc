#include <nan.h>
#include <node.h>
#ifdef linux
#include <X11/Xlib.h>
#include <X11/extensions/Xrandr.h>
#elif __APPLE__
#include <CoreGraphics/CoreGraphics.h>
#elif _WIN32
#include <Windows.h>
#endif

using namespace v8;

void GetScreenshot(const Nan::FunctionCallbackInfo<Value>& args) {
    // Get all expected arguments as integers.
    Isolate* isolate = args.GetIsolate();
    if (args.Length() != 4) {
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
    Local<Value> thirdArg = args[2];
    if (!thirdArg->IsNumber()) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Argument is not a number").ToLocalChecked()));
        return;
    }
    int boundsWidth = thirdArg.As<Number>()->Value();
    Local<Value> fourthArg = args[3];
    if (!fourthArg->IsNumber()) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Argument is not a number").ToLocalChecked()));
        return;
    }
    int boundsHeight = fourthArg.As<Number>()->Value();

#ifdef linux
    // Get the display and its default screen. Note screens are not monitors!
    Display* display = XOpenDisplay(NULL);
    if (!display) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Could not find display").ToLocalChecked()));
        return;
    }

    // Get the screens root window. This will be what we want to capture.
    Window win = RootWindow(display, DefaultScreen(display));

    // Find a monitor that matches the top-left corner we were given.
    bool found = false;
    int monitorCount;
    XRRMonitorInfo monitor;
    XRRMonitorInfo* monitors = XRRGetMonitors(display, win, true, &monitorCount);
    for (int i = 0; i < monitorCount; i++) {
        // Get the monitor.
        monitor = monitors[i];

        // Handle checking the top left.
        if (monitor.x == boundsX && monitor.y == boundsY && monitor.height == boundsHeight && monitor.width == boundsWidth) {
            printf("matched monitor at x: %d, y: %d, automatic: %i\n", monitor.x, monitor.y, monitor.automatic);
            found = true;
        } else {
            printf("scanned monitor at x: %d, y: %d - no match!\n", monitor.x, monitor.y);
        }

        // At the end of everything, break.
        if (found) {
            break;
        }
    }
    XFree(monitors);

    // If said monitor was not found, throw an error.
    if (!found) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Could not find monitor").ToLocalChecked()));
        return;
    }

    // Get the image from the window.
    XImage* image = XGetImage(display, win, monitor.x, monitor.y, monitor.width, monitor.height, AllPlanes, ZPixmap);
    XCloseDisplay(display);
    if (image == NULL) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Could not get image").ToLocalChecked()));
        return;
    }

    // Create a new allocation and turn it into RGBA.
    size_t size = image->width * image->height * 4;
    uint8_t* bytes = (uint8_t*)malloc(size);
    uint8_t* initData = (uint8_t*)image->data;
    for (size_t blockStart = 0; blockStart < size; blockStart += 4) {
        bytes[blockStart] = initData[blockStart + 2];
        bytes[blockStart + 1] = initData[blockStart + 1];
        bytes[blockStart + 2] = initData[blockStart];

        // X sometimes decides to return 0 for the A byte for some reason.
        // We should always make sure it is visible.
        bytes[blockStart + 3] = 255;
    }
#elif __APPLE__
    // Get the relevant display.
    CGPoint point = CGPointMake((CGFloat)boundsX, (CGFloat)boundsY);
    CGDirectDisplayID display;
    uint32_t displayCount;
    CGError err = CGGetDisplaysWithPoint(point, 1, &display, &displayCount);
    if (err != kCGErrorSuccess || displayCount != 1) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Could not get display").ToLocalChecked()));
        return;
    }

    // Get the image from the display.
    CGImageRef image = CGDisplayCreateImage(display);
    CGColorSpaceRef colorSpace = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    if (!colorSpace) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Could not get color space").ToLocalChecked()));
        CGImageRelease(image);
        return;
    }
    size_t width = CGImageGetWidth(image);
    size_t height = CGImageGetHeight(image);
    size_t size = width * height * 4;
    uint8_t* bytes = (uint8_t*)malloc(size);
    CGContextRef context = CGBitmapContextCreate(bytes, width, height, 8, width * 4, colorSpace, kCGImageAlphaNoneSkipFirst);
    if (!context) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Could not create bitmap context").ToLocalChecked()));
        CGImageRelease(image);
        CGColorSpaceRelease(colorSpace);
        return;
    }
    CGImageRef copyRef = CGImageCreateCopyWithColorSpace(image, colorSpace);
    if (!copyRef) {
        isolate->ThrowException(Exception::Error(String::NewFromUtf8(isolate, "Failed to make image with correct color space").ToLocalChecked()));
        CGImageRelease(image);
        CGColorSpaceRelease(colorSpace);
        return;
    }
    CGContextDrawImage(context, CGRectMake(0, 0, width, height), copyRef);
    CGImageRelease(image);
    CGColorSpaceRelease(colorSpace);
    CGImageRelease(copyRef);

    // Align the bytes of the image to RGBA.
    for (size_t blockStart = 0; blockStart < size; blockStart += 4) {
        bytes[blockStart] = bytes[blockStart + 1];
        bytes[blockStart + 1] = bytes[blockStart + 2];
        bytes[blockStart + 2] = bytes[blockStart + 3];
        bytes[blockStart + 3] = 255;
    }
#elif _WIN32
    // TODO: Implement windows api support.
#endif

    // Create an array buffer from this new allocation and free the old image.
    Nan::MaybeLocal<Object> buf = Nan::NewBuffer((char*)bytes, size);
#ifdef linux
    XFree(image);
#endif

    // Set the buffer as the return value.
    args.GetReturnValue().Set(buf.ToLocalChecked());
}

void Initialize(Local<Object> exports) {
    Local<Context> context = exports->CreationContext();
    exports->Set(context,
        Nan::New("getScreenshotForBounds").ToLocalChecked(),
        Nan::New<FunctionTemplate>(GetScreenshot)
            ->GetFunction(context)
            .ToLocalChecked());
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
