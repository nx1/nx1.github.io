def products(nums):
    # Generate prefix products
    prefix_products = []
    for num in nums:
        if prefix_products:
            prefix_products.append(prefix_products[-1] * num)
        else:
            prefix_products.append(num)

    
    # Generate Suffix products
    suffix_products = []
    for num in reversed(nums):
        if suffix_products:
            suffix_products.append(suffix_products[-1] * num)
        else:
            suffix_products.append(num)
    suffix_products = list(reversed(suffix_products))


    # Generate result from the product of the prefixes and suffixes.
    result = []
    for i in range(len(nums)):
        if i == 0:
            result.append(suffix_products[i+1])
        elif i == len(nums) - 1:
            result.append(prefix_products[i-1])
        else:
            result.append(
                prefix_products[i-1] * suffix_products[i+1]
            )
    return result

if __name__ == "__main__":
    arr = [1,2,3,4,5]
    print(products(arr))
