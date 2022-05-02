package main

import (
	"container/list"
	"fmt"
	"image"
	"image/color/palette"
	"image/draw"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	gif "github.com/jakemakesstuff/faster-image-gif"
	"github.com/kbinani/screenshot"
)

func main() {
	// Format panics magically.
	defer func() {
		if r := recover(); r != nil {
			_, _ = os.Stderr.Write([]byte(fmt.Sprint(r)))
			_ = os.Stderr.Sync()
			os.Exit(1)
		}
	}()

	// Get the rectangle.
	width, err := strconv.Atoi(os.Getenv("WIDTH"))
	if err != nil {
		panic(err)
	}
	height, err := strconv.Atoi(os.Getenv("HEIGHT"))
	if err != nil {
		panic(err)
	}
	x, err := strconv.Atoi(os.Getenv("X"))
	if err != nil {
		panic(err)
	}
	y, err := strconv.Atoi(os.Getenv("Y"))
	if err != nil {
		panic(err)
	}
	rect := image.Rect(x, y, x+width, y+height)

	// Defines the atomic pointer used to cancel.
	var cancel uintptr

	// Defines the image list.
	var (
		imageList     = list.New()
		imageListLock = &sync.Mutex{}
	)

	// Defines the goroutine that handles roughly 15fps screenshotting.
	go func() {
		// Hold the lock to the list until we are done for performance reasons.
		imageListLock.Lock()
		defer imageListLock.Unlock()

		// Loop until we are canceled.
		for atomic.LoadUintptr(&cancel) == 0 {
			// Get the screenshot.
			rgba, err := screenshot.CaptureRect(rect)
			if err != nil {
				panic(err)
			}

			// Add the image to the list.
			imageList.PushBack(rgba)

			// Sleep until the next frame.
			time.Sleep(time.Second / 15)
		}
	}()

	// Wait for a signal from the Node process to stop.
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	// Set the cancel flag.
	atomic.StoreUintptr(&cancel, 1)

	// Wait for the image lock to be released.
	imageListLock.Lock()

	// Create the GIF item.
	g := &gif.GIF{}
	l := imageList.Len()
	g.Image = make([]*image.Paletted, l)
	g.Delay = make([]int, l)

	// Get the bounds of the front image.
	b := imageList.Front().Value.(*image.RGBA).Bounds()

	// Defines the limited part of plan 9 that we need.
	p9l := palette.Plan9[:256]

	// Handle creating the GIF images.
	wg := &sync.WaitGroup{}
	wg.Add(l)
	paletted := make([]image.Paletted, l)
	i := 0
	for el := imageList.Front(); el != nil; el = el.Next() {
		go func(i int, rgba *image.RGBA, ptr *image.Paletted) {
			// Draw the paletted image.
			pimg := image.NewPaletted(b, p9l)
			draw.FloydSteinberg.Draw(pimg, b, rgba, image.Point{})

			// Add to the images.
			g.Image[i] = pimg
			g.Delay[i] = 6

			// Set wg option to done.
			wg.Done()
		}(i, el.Value.(*image.RGBA), &paletted[i])
		i++
	}
	wg.Wait()

	// Write the GIF to stdout.
	err = gif.EncodeAll(os.Stdout, g)
	if err != nil {
		panic(err)
	}
	_ = os.Stdout.Sync()
}
