def calc_max_subarray_sum(arr):
    """
    sub1:
    [34]
    [34, -50]
    [34, -50, 42]
    [34, -50, 42, 14]
    [34, -50, 42, 14, -5]

    sub2:
    [34, -50, 42, 14, -5, 86]
    [-50, 42, 14, -5, 86]
    [42, 14, -5, 86]
    [14, -5, 86]
    [-5, 86]
    [86]
    """
    max_arr_sum = 0
    n = len(arr)
    for i in range(n):
        sub1 = arr[0:i]
        sub2 = arr[i:n]
        
        for sub in [sub1,sub2]:
            arr_sum = sum(sub)
            if arr_sum > max_arr_sum:
                max_arr_sum = arr_sum
    return max_arr_sum

if __name__ == "__main__":
    arr1 = [34, -50, 42, 14, -5, 86]
    max_sum = calc_max_subarray_sum(arr1)
    print(max_sum)
