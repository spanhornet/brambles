import time

def main():
    """
    Main function that prints "Hello, World!" every 10 seconds.
    """
    
    try:
        while True:
            print("Hello, World!")
            time.sleep(10)
    except KeyboardInterrupt:
        print("\nStopping Python worker. Goodbye!")

if __name__ == "__main__":
    main()