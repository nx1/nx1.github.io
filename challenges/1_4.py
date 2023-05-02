def number_of_smaller_right(arr):
    n = len(arr)
    out = [0]*n
    for i in range(n):
        num_smaller = 0
        v = arr[i]
        for j in range(i,n):
            v2 = arr[j]
            if v2 < v:
                num_smaller+=1
        out[i] = num_smaller
    return out

if __name__ == "__main__":
    arr = [3,4,7,6,1]
    arr = [3,4,7,6,1]
    print(number_of_smaller_right(arr))

