def insertion_sort(arr):
    arr = arr.copy()
    for i in range(len(arr)):
        lowest = 999999999
        for j in range(i,len(arr)):
            val = arr[j]
            if val < lowest:
                #print(f'i={i} j={j} {val}<{lowest} New lowest value found!')
                lowest = val
                lowest_idx = j
        prev = arr[i]
        arr[i] = lowest
        arr[lowest_idx] = prev
    return arr

def get_smallest_sort_window(arr):
    win_start, win_end = None, None
    arr_sorted = insertion_sort(arr)
    
    for i in range(len(arr)):
        v1 = arr[i]
        v2 = arr_sorted[i]
        if v1!=v2:
            win_start = i
            break
    for i in reversed(range(len(arr))):
        v1 = arr[i]
        v2 = arr_sorted[i]
        if v1!=v2:
            win_end = i
            break

    return (win_start,win_end)



if __name__ == "__main__":
    arr1 = [3,7,5,6,9]         # 1,3
    arr2 = [1,2,3,4,5]         # None (array is already sorted)
    arr3 = [5,4,3,2,1]         # 0,4
    arr4 = [1,2,3,7,8,9,4,5,6] # 3,8

    for arr in [arr1,arr2,arr3,arr4]:
        print(arr)
        print(get_smallest_sort_window(arr))
