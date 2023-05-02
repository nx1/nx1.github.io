#include <stdio.h>
#include <stdlib.h>

void print_arr(int *arr, int n){
    printf("Array: [");
    for(int i=0;i<n;i++){
        printf("%d, ", arr[i]);
    }
    printf("]\n");
}

int *number_of_smaller_right(int *arr, int n){
    int *out = malloc(size * sizeof(int));
    

}


int main(){
    int n = 5;
    int arr1[5] = {3,4,7,6,1};

    int out[5];

    printf("Input array:\n");
    print_arr(arr1,6);


    printf("Output:\n");
    printf("%d\n", number_of_smaller_right(arr1, n));
}
